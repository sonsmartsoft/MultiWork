import { dialog, ipcMain, shell, type WebContents } from 'electron'
import { randomUUID } from 'node:crypto'
import {
  AccountInstance,
  AddAccountPayload,
  AISettingsUpdate,
  BossWatchRule,
  IPC_CHANNELS,
  IncomingNotificationPayload,
  RemoveAccountPayload,
  ScheduleEvent,
  SERVICE_CATALOG,
  SetAssistantPanelPayload,
  SetChatVisiblePayload,
  SetSidebarWidthPayload,
  SwitchAccountPayload,
  TodoItem,
  UnreadUpdatedPayload
} from '../shared/types'
import { aiService } from './ai-service'
import { AssistantService } from './assistant-service'
import { evaluateNotification } from './boss-filter'
import { ExtensionLoader } from './extension-loader'
import {
  detectKakaoTalkDeep,
  dockKakaoTalk,
  launchKakaoTalk,
  undockKakaoTalk
} from './native-dock/kakao-docker'
import {
  detectWeChatDeep,
  dockWeChat,
  launchWeChat,
  undockWeChat
} from './native-dock/wechat-docker'
import { SessionVault } from './session-vault'
import { JsonStore } from './store'
import { ViewManager } from './view-manager'

export interface IpcDeps {
  store: JsonStore
  vault: SessionVault
  viewManager: ViewManager
  assistant: AssistantService
  extensionLoader: ExtensionLoader
  /** The shell (React UI) webContents — target for Main -> Renderer events. */
  shellWebContents: () => WebContents | null
}

/**
 * Registers the full IPC contract of docs/SPRINT_1_SPEC_FOR_MUSE.md §2.
 *
 * Renderer <-> Main channels are `invoke`-based. The two `chat:*` channels
 * arrive from chat-view preloads via `ipcRenderer.send`; the sender is
 * resolved back to its account through the ViewManager so a view can only
 * ever report about itself.
 */
export function registerIpcHandlers(deps: IpcDeps): void {
  const { store, vault, viewManager, assistant, extensionLoader } = deps

  // -- Accounts ------------------------------------------------------------

  ipcMain.handle(IPC_CHANNELS.ACCOUNTS_LIST, () => store.data.accounts)

  ipcMain.handle(
    IPC_CHANNELS.ACCOUNTS_ADD,
    async (_event, payload: AddAccountPayload) => {
      const entry = SERVICE_CATALOG[payload.serviceType]
      const id = randomUUID().replace(/-/g, '')
      const account: AccountInstance = {
        id,
        serviceType: payload.serviceType,
        displayName: payload.displayName || entry.label,
        workspaceId: 'default',
        partitionName: `persist:acc_${id}`,
        frozenUserAgent: vault.makeFrozenUserAgent(),
        homeUrl: payload.customUrl ?? entry.url ?? '',
        unreadCount: 0,
        isMuted: false,
        keepAliveIntervalMinutes: 15,
        createdAt: new Date().toISOString()
      }
      store.data.accounts.push(account)
      store.save()
      await viewManager.switchTo(account.id)
      return account
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ACCOUNTS_SWITCH,
    async (_event, payload: SwitchAccountPayload) => {
      await viewManager.switchTo(payload.accountId)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ACCOUNTS_REMOVE,
    async (_event, payload: RemoveAccountPayload) => {
      const account = store.getAccount(payload.accountId)
      if (!account) return false
      viewManager.removeView(account.id)
      await vault.clearPartition(account)
      store.data.accounts = store.data.accounts.filter(
        (a) => a.id !== account.id
      )
      if (store.data.activeAccountId === account.id) {
        store.data.activeAccountId = store.data.accounts[0]?.id ?? null
        if (store.data.activeAccountId) {
          await viewManager.switchTo(store.data.activeAccountId)
        }
      }
      store.save()
      return true
    }
  )

  // -- Layout --------------------------------------------------------------

  ipcMain.handle(
    IPC_CHANNELS.LAYOUT_SET_ASSISTANT_PANEL,
    (_event, payload: SetAssistantPanelPayload) => {
      viewManager.setLayout({
        assistantOpen: payload.isOpen,
        assistantWidth: payload.width
      })
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.LAYOUT_SET_SIDEBAR_WIDTH,
    (_event, payload: SetSidebarWidthPayload) => {
      viewManager.setLayout({ sidebarWidth: payload.width })
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.LAYOUT_SET_CHAT_VISIBLE,
    (_event, payload: SetChatVisiblePayload) => {
      viewManager.setLayout({ chatVisible: payload.visible })
    }
  )

  // -- Boss rule ------------------------------------------------------------

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_GET_BOSS_RULE, () => store.data.bossRule)

  ipcMain.handle(
    IPC_CHANNELS.ASSISTANT_SET_BOSS_RULE,
    (_event, rule: BossWatchRule) => {
      store.data.bossRule = rule
      store.save()
    }
  )

  // -- Assistant state persistence (REV-01 [HIGH-04]) ----------------------

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_GET_STATE, () => assistant.getState())

  ipcMain.handle(
    IPC_CHANNELS.ASSISTANT_SAVE_TODOS,
    (_event, todos: TodoItem[]) => {
      assistant.saveTodos(Array.isArray(todos) ? todos : [])
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ASSISTANT_SAVE_EVENTS,
    (_event, events: ScheduleEvent[]) => {
      assistant.saveEvents(Array.isArray(events) ? events : [])
    }
  )

  // -- AI engine settings ---------------------------------------------------
  // The API key is accepted here only to be handed to AIService, which
  // encrypts it with safeStorage; it is never returned to the renderer.

  ipcMain.handle(IPC_CHANNELS.AI_GET_SETTINGS, () => aiService.getView())

  ipcMain.handle(
    IPC_CHANNELS.AI_SET_SETTINGS,
    (_event, update: AISettingsUpdate) => {
      const safe: AISettingsUpdate =
        update && typeof update === 'object' ? update : {}
      // `apiKey` may legitimately be '' (clear); other fields pass through.
      return aiService.update(safe)
    }
  )

  ipcMain.handle(IPC_CHANNELS.AI_TEST_CONNECTION, () =>
    aiService.testConnection()
  )

  // -- External links (Sprint 3, MUSE-07) ----------------------------------
  // Only Google Calendar template links may leave the app; anything else
  // a web page tries to push through here is refused.

  ipcMain.handle(
    IPC_CHANNELS.SHELL_OPEN_EXTERNAL,
    async (_event, url: string) => {
      if (typeof url !== 'string') return false
      let parsed: URL
      try {
        parsed = new URL(url)
      } catch {
        return false
      }
      if (
        parsed.protocol !== 'https:' ||
        parsed.hostname !== 'calendar.google.com'
      ) {
        return false
      }
      await shell.openExternal(url)
      return true
    }
  )

  // -- LINE extension (Sprint 2, MUSE-04) --------------------------------

  ipcMain.handle(IPC_CHANNELS.LINE_GET_STATUS, () => extensionLoader.status())

  ipcMain.handle(IPC_CHANNELS.LINE_PICK_EXTENSION_DIR, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Chọn thư mục LINE Extension (chứa manifest.json)',
      properties: ['openDirectory']
    })
    if (!result.canceled && result.filePaths[0]) {
      store.data.lineExtensionDir = result.filePaths[0]
      store.save()
      await viewManager.reloadLineViews()
    }
    return extensionLoader.status()
  })

  // -- KakaoTalk native dock (Sprint 2, MUSE-05) --------------------------

  ipcMain.handle(IPC_CHANNELS.KAKAO_GET_STATUS, () => detectKakaoTalkDeep())

  ipcMain.handle(IPC_CHANNELS.KAKAO_LAUNCH, () => launchKakaoTalk())

  ipcMain.handle(IPC_CHANNELS.KAKAO_DOCK, async () => {
    const result = await dockKakaoTalk(viewManager.viewportScreenBounds())
    // Sprint 3 (MUSE-08): a successful dock arms the auto-follow /
    // auto-hide lifecycle sync in the ViewManager.
    if (result.ok) viewManager.setKakaoDocked(true)
    return result
  })

  ipcMain.handle(IPC_CHANNELS.KAKAO_UNDOCK, async () => {
    const result = await undockKakaoTalk()
    if (result.ok) viewManager.setKakaoDocked(false)
    return result
  })

  // -- WeChat native dock (same pattern as KakaoTalk) -----------------------

  ipcMain.handle(IPC_CHANNELS.WECHAT_GET_STATUS, () => detectWeChatDeep())

  ipcMain.handle(IPC_CHANNELS.WECHAT_LAUNCH, () => launchWeChat())

  ipcMain.handle(IPC_CHANNELS.WECHAT_DOCK, async () => {
    const result = await dockWeChat(viewManager.viewportScreenBounds())
    if (result.ok) viewManager.setWechatDocked(true)
    return result
  })

  ipcMain.handle(IPC_CHANNELS.WECHAT_UNDOCK, async () => {
    const result = await undockWeChat()
    if (result.ok) viewManager.setWechatDocked(false)
    return result
  })

  // -- Chat preload signals --------------------------------------------------

  // REV-01 [CRITICAL-03]: the account is resolved AUTHORITATIVELY from
  // `event.sender` through the ViewManager map. The payload's accountId is
  // only a hint (it may be empty when a sandboxed preload cannot see
  // `additionalArguments`): reject solely on an actual mismatch.
  ipcMain.on(IPC_CHANNELS.CHAT_UNREAD_UPDATED, (event, payload: UnreadUpdatedPayload) => {
    const accountId = viewManager.accountIdForWebContents(event.sender.id)
    if (!accountId) return
    if (payload.accountId && payload.accountId !== accountId) return
    // setUnread forwards to the shell via ViewManager's emitUnread callback.
    viewManager.setUnread(accountId, payload.unreadCount)
  })

  ipcMain.on(
    IPC_CHANNELS.CHAT_INCOMING_NOTIFICATION,
    (event, payload: IncomingNotificationPayload) => {
      const accountId = viewManager.accountIdForWebContents(event.sender.id)
      if (!accountId) return
      if (payload.accountId && payload.accountId !== accountId) return
      const account = store.getAccount(accountId)
      if (!account || account.isMuted) return
      const result = evaluateNotification(store.data.bossRule, account, payload)
      if (!result) return
      // REV-01 [HIGH-04]: AssistantService persists the directive (and the
      // todo/event when present) to the JsonStore before broadcasting.
      assistant.ingestFilterResult(result)
    }
  )
}
