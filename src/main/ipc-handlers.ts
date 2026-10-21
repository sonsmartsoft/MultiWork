import { ipcMain, type WebContents } from 'electron'
import { randomUUID } from 'node:crypto'
import {
  AccountInstance,
  AddAccountPayload,
  BossWatchRule,
  IPC_CHANNELS,
  IncomingNotificationPayload,
  RemoveAccountPayload,
  SERVICE_CATALOG,
  SetAssistantPanelPayload,
  SetChatVisiblePayload,
  SetSidebarWidthPayload,
  SwitchAccountPayload,
  UnreadUpdatedPayload
} from '../shared/types'
import { evaluateNotification, toNewDirectivePayload } from './boss-filter'
import { SessionVault } from './session-vault'
import { JsonStore } from './store'
import { ViewManager } from './view-manager'

export interface IpcDeps {
  store: JsonStore
  vault: SessionVault
  viewManager: ViewManager
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
  const { store, vault, viewManager } = deps

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

  // -- Chat preload signals --------------------------------------------------

  ipcMain.on(IPC_CHANNELS.CHAT_UNREAD_UPDATED, (event, payload: UnreadUpdatedPayload) => {
    const accountId = viewManager.accountIdForWebContents(event.sender.id)
    if (!accountId || payload.accountId !== accountId) return
    // setUnread forwards to the shell via ViewManager's emitUnread callback.
    viewManager.setUnread(accountId, payload.unreadCount)
  })

  ipcMain.on(
    IPC_CHANNELS.CHAT_INCOMING_NOTIFICATION,
    (event, payload: IncomingNotificationPayload) => {
      const accountId = viewManager.accountIdForWebContents(event.sender.id)
      if (!accountId || payload.accountId !== accountId) return
      const account = store.getAccount(accountId)
      if (!account || account.isMuted) return
      const result = evaluateNotification(store.data.bossRule, account, payload)
      if (!result) return
      deps
        .shellWebContents()
        ?.send(
          IPC_CHANNELS.ASSISTANT_NEW_DIRECTIVE,
          toNewDirectivePayload(result)
        )
    }
  )
}
