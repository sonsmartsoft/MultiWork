import { BaseWindow, Menu, WebContentsView } from 'electron'
import path from 'node:path'
import {
  AccountInstance,
  LAYOUT,
  SERVICE_CATALOG,
  UnreadUpdatedPayload
} from '../shared/types'
import type { SelectionActionKind } from './assistant-service'
import { ExtensionLoader } from './extension-loader'
import {
  detectKakaoTalk,
  kakaoGuidePage
} from './native-dock/kakao-docker'
import { SessionVault } from './session-vault'
import { JsonStore } from './store'

export interface LayoutState {
  sidebarWidth: number
  assistantOpen: boolean
  assistantWidth: number
  /** False while a shell modal (Add Service / Watchlist) is open. */
  chatVisible: boolean
}

const INTERCEPTOR_PRELOAD = path.join(__dirname, '../preload/base-interceptor.js')

function parseUnreadFromTitle(title: string): number {
  const match = /^\s*\((\d+)\)/.exec(title)
  return match ? parseInt(match[1], 10) : 0
}

function placeholderPage(label: string, sprint: string): string {
  const html = `<!doctype html><meta charset="utf-8">
<style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#14161c;color:#c8cdd6;font-family:system-ui;text-align:center}
.box{max-width:420px;padding:24px}h2{color:#f5b942;margin:0 0 8px}p{line-height:1.5;color:#9aa3b2}</style>
<div class="box"><h2>${label}</h2><p>Tích hợp ${label} sẽ được nối ở ${sprint}.<br/>Khung hiển thị và phân vùng phiên đã được chuẩn bị sẵn.</p></div>`
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}

/**
 * ViewManager — owns the lifecycle of every chat `WebContentsView` and the
 * 3-column layout math (docs/SPRINT_1_SPEC_FOR_MUSE.md §MUSE-02.1/02.3).
 *
 * The shell (React UI) is a separate full-window view added BEFORE any chat
 * view; chat views only ever occupy the center viewport rectangle:
 *   x = sidebarWidth, y = TOP_BAR_HEIGHT,
 *   width  = windowWidth  - sidebarWidth - (assistantOpen ? assistantWidth : 0)
 *   height = windowHeight - TOP_BAR_HEIGHT
 */
export class ViewManager {
  private views = new Map<string, WebContentsView>()
  private restoredPartitions = new Set<string>()
  private accountByWebContentsId = new Map<number, string>()
  private activeAccountId: string | null = null
  private layout: LayoutState = {
    sidebarWidth: LAYOUT.SIDEBAR_COLLAPSED_WIDTH,
    assistantOpen: true,
    assistantWidth: LAYOUT.ASSISTANT_PANEL_WIDTH,
    chatVisible: true
  }

  /**
   * Sprint 2 (MUSE-04): wired by index.ts — receives text selections the
   * user picks from a chat view's context menu.
   */
  onSelectionAction:
    | ((account: AccountInstance, text: string, kind: SelectionActionKind) => void)
    | null = null

  constructor(
    private readonly window: BaseWindow,
    private readonly vault: SessionVault,
    private readonly store: JsonStore,
    private readonly emitUnread: (payload: UnreadUpdatedPayload) => void,
    private readonly extensionLoader?: ExtensionLoader
  ) {}

  get activeId(): string | null {
    return this.activeAccountId
  }

  accountIdForWebContents(webContentsId: number): string | undefined {
    return this.accountByWebContentsId.get(webContentsId)
  }

  /** Create the view for an account if needed, restore its session, load it. */
  async ensureView(account: AccountInstance): Promise<WebContentsView> {
    const existing = this.views.get(account.id)
    if (existing) return existing

    const ses = this.vault.sessionFor(account)
    if (!this.restoredPartitions.has(account.partitionName)) {
      this.restoredPartitions.add(account.partitionName)
      await this.vault.restoreSnapshot(account, ses)
    }

    const view = new WebContentsView({
      webPreferences: {
        session: ses,
        preload: INTERCEPTOR_PRELOAD,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        additionalArguments: [`--multiwork-account-id=${account.id}`]
      }
    })
    view.webContents.setUserAgent(account.frozenUserAgent)

    // Main-side unread fallback (the interceptor reports the same signal;
    // both flow through the dedupe in setUnread).
    view.webContents.on('page-title-updated', (_event, title) => {
      this.setUnread(account.id, parseUnreadFromTitle(title))
    })

    // Sprint 2 (MUSE-04): selection context menu. `params.selectionText`
    // is captured by Chromium itself, so this works on EVERY chat platform
    // regardless of the web app's DOM. The picked text is forwarded to the
    // AssistantService, which persists it as a directive / To-Do.
    view.webContents.on('context-menu', (_event, params) => {
      const text = params.selectionText?.trim()
      if (!text || !this.onSelectionAction) return
      const handler = this.onSelectionAction
      const menu = Menu.buildFromTemplate([
        {
          label: '🤖 Dịch & Thêm vào Việc cần làm (MultiWork AI)',
          click: () => handler(account, text, 'todo')
        },
        {
          label: '📌 Đánh dấu là Chỉ thị của Sếp',
          click: () => handler(account, text, 'directive')
        }
      ])
      menu.popup({ window: this.window })
    })

    this.views.set(account.id, view)
    this.accountByWebContentsId.set(view.webContents.id, account.id)
    this.window.contentView.addChildView(view)
    view.setBounds(this.viewportBounds())
    view.setVisible(false)

    const entry = SERVICE_CATALOG[account.serviceType]
    if (entry.kind === 'extension') {
      // Sprint 2 (MUSE-04): LINE runs as the official Chrome extension
      // inside this account's own session partition.
      const loaded = this.extensionLoader
        ? await this.extensionLoader.ensureLoaded(ses, account.partitionName)
        : null
      const url = loaded
        ? this.extensionLoader!.extensionUrl(loaded.extensionId)
        : this.extensionLoader?.guidePage() ??
          placeholderPage(entry.label, 'Sprint 2 (Extension Loader)')
      await view.webContents.loadURL(url).catch(() => undefined)
    } else if (entry.kind === 'native') {
      // Sprint 2 (MUSE-05): KakaoTalk is coordinated as a native window;
      // the chat view shows the status/guide page.
      await view.webContents
        .loadURL(kakaoGuidePage(detectKakaoTalk()))
        .catch(() => undefined)
    } else if (account.homeUrl) {
      await view.webContents.loadURL(account.homeUrl).catch(() => undefined)
    } else {
      await view.webContents
        .loadURL(placeholderPage(entry.label, 'Sprint 2'))
        .catch(() => undefined)
    }
    return view
  }

  /**
   * Sprint 2 (MUSE-04): after the user picks a LINE extension folder,
   * (re)load every LINE view against the (new) extension state.
   */
  async reloadLineViews(): Promise<void> {
    if (!this.extensionLoader) return
    for (const account of this.store.data.accounts) {
      if (SERVICE_CATALOG[account.serviceType].kind !== 'extension') continue
      const view = this.views.get(account.id)
      if (!view) continue
      const ses = this.vault.sessionFor(account)
      const loaded = await this.extensionLoader.ensureLoaded(
        ses,
        account.partitionName
      )
      const url = loaded
        ? this.extensionLoader.extensionUrl(loaded.extensionId)
        : this.extensionLoader.guidePage()
      await view.webContents.loadURL(url).catch(() => undefined)
    }
  }

  /** Show one account's view in the viewport; hide the previous one. */
  async switchTo(accountId: string): Promise<void> {
    const account = this.store.getAccount(accountId)
    if (!account) return
    const view = await this.ensureView(account)
    if (this.activeAccountId && this.activeAccountId !== accountId) {
      this.views.get(this.activeAccountId)?.setVisible(false)
    }
    this.activeAccountId = accountId
    this.store.data.activeAccountId = accountId
    this.store.save()
    view.setBounds(this.viewportBounds())
    view.setVisible(this.layout.chatVisible)
  }

  /** Destroy a view and drop its bookkeeping (partition wipe is separate). */
  removeView(accountId: string): void {
    const view = this.views.get(accountId)
    if (!view) return
    this.accountByWebContentsId.delete(view.webContents.id)
    this.window.contentView.removeChildView(view)
    view.webContents.close()
    this.views.delete(accountId)
    if (this.activeAccountId === accountId) this.activeAccountId = null
  }

  /** Merge new layout inputs and re-apply bounds/visibility to the active view. */
  setLayout(partial: Partial<LayoutState>): void {
    this.layout = { ...this.layout, ...partial }
    const active = this.activeAccountId
      ? this.views.get(this.activeAccountId)
      : undefined
    if (active) {
      active.setBounds(this.viewportBounds())
      active.setVisible(this.layout.chatVisible)
    }
  }

  /** Re-apply bounds after the window itself was resized. */
  handleResize(): void {
    const active = this.activeAccountId
      ? this.views.get(this.activeAccountId)
      : undefined
    if (active) active.setBounds(this.viewportBounds())
  }

  /** Single funnel for unread updates (interceptor IPC + title fallback). */
  setUnread(accountId: string, unreadCount: number): void {
    const account = this.store.getAccount(accountId)
    if (!account || account.unreadCount === unreadCount) return
    account.unreadCount = unreadCount
    this.store.save()
    this.emitUnread({ accountId, unreadCount })
  }

  /** The center viewport rectangle for the active chat view. */
  viewportBounds(): { x: number; y: number; width: number; height: number } {
    const { width, height } = this.window.getContentBounds()
    const right = this.layout.assistantOpen ? this.layout.assistantWidth : 0
    return {
      x: this.layout.sidebarWidth,
      y: LAYOUT.TOP_BAR_HEIGHT,
      width: Math.max(0, width - this.layout.sidebarWidth - right),
      height: Math.max(0, height - LAYOUT.TOP_BAR_HEIGHT)
    }
  }

  /**
   * The viewport rectangle in absolute SCREEN coordinates (Sprint 2,
   * MUSE-05: the rectangle the KakaoTalk window is docked onto).
   */
  viewportScreenBounds(): { x: number; y: number; width: number; height: number } {
    const rel = this.viewportBounds()
    const content = this.window.getContentBounds()
    return {
      x: content.x + rel.x,
      y: content.y + rel.y,
      width: rel.width,
      height: rel.height
    }
  }
}
