import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  AddAccountPayload,
  BossWatchRule,
  IPC_CHANNELS,
  MultiWorkAPI,
  NewDirectivePayload,
  RemoveAccountPayload,
  SetAssistantPanelPayload,
  SetChatVisiblePayload,
  SetSidebarWidthPayload,
  SwitchAccountPayload,
  UnreadUpdatedPayload
} from '../shared/types'

/**
 * Shell preload — exposes the typed `window.multiworkAPI` bridge to the
 * React renderer (docs/SPRINT_1_SPEC_FOR_MUSE.md §MUSE-03.1).
 * The renderer never touches ipcRenderer directly.
 */
const api: MultiWorkAPI = {
  listAccounts: () => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_LIST),
  addAccount: (payload: AddAccountPayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_ADD, payload),
  switchAccount: (payload: SwitchAccountPayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_SWITCH, payload),
  removeAccount: (payload: RemoveAccountPayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_REMOVE, payload),
  setAssistantPanel: (payload: SetAssistantPanelPayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.LAYOUT_SET_ASSISTANT_PANEL, payload),
  setSidebarWidth: (payload: SetSidebarWidthPayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.LAYOUT_SET_SIDEBAR_WIDTH, payload),
  setChatVisible: (payload: SetChatVisiblePayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.LAYOUT_SET_CHAT_VISIBLE, payload),
  getBossRule: () => ipcRenderer.invoke(IPC_CHANNELS.ASSISTANT_GET_BOSS_RULE),
  setBossRule: (rule: BossWatchRule) =>
    ipcRenderer.invoke(IPC_CHANNELS.ASSISTANT_SET_BOSS_RULE, rule),

  onUnreadUpdated: (callback: (payload: UnreadUpdatedPayload) => void) => {
    const listener = (_event: IpcRendererEvent, payload: UnreadUpdatedPayload) =>
      callback(payload)
    ipcRenderer.on(IPC_CHANNELS.CHAT_UNREAD_UPDATED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.CHAT_UNREAD_UPDATED, listener)
    }
  },

  onNewDirective: (callback: (payload: NewDirectivePayload) => void) => {
    const listener = (_event: IpcRendererEvent, payload: NewDirectivePayload) =>
      callback(payload)
    ipcRenderer.on(IPC_CHANNELS.ASSISTANT_NEW_DIRECTIVE, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ASSISTANT_NEW_DIRECTIVE, listener)
    }
  }
}

contextBridge.exposeInMainWorld('multiworkAPI', api)
