import { BaseWindow, WebContentsView } from 'electron'
import path from 'node:path'
import {
  AccountInstance,
  LAYOUT,
  SERVICE_CATALOG,
  UnreadUpdatedPayload
} from '../shared/types'
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

  constructor(
    private readonly window: BaseWindow,
    private readonly vault: SessionVault,
    private readonly store: JsonStore,
    private readonly emitUnread: (payload: UnreadUpdatedPayload) => void
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

    this.views.set(account.id, view)
    this.accountByWebContentsId.set(view.webContents.id, account.id)
    this.window.contentView.addChildView(view)
    view.setBounds(this.viewportBounds())
    view.setVisible(false)

    const entry = SERVICE_CATALOG[account.serviceType]
    if (account.homeUrl) {
      await view.webContents.loadURL(account.homeUrl).catch(() => undefined)
    } else if (entry.kind === 'extension') {
      await view.webContents
        .loadURL(placeholderPage(entry.label, 'Sprint 2 (Extension Loader)'))
        .catch(() => undefined)
    } else {
      await view.webContents
        .loadURL(placeholderPage(entry.label, 'Sprint 2 (Native Window Docker)'))
        .catch(() => undefined)
    }
    return view
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
}
