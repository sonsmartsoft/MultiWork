import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  AddAccountPayload,
  BossWatchRule,
  MultiWorkAPI,
  NewDirectivePayload,
  RemoveAccountPayload,
  ScheduleEvent,
  SetAssistantPanelPayload,
  SetChatVisiblePayload,
  SetSidebarWidthPayload,
  SwitchAccountPayload,
  TodoItem,
  UnreadUpdatedPayload
} from '../shared/types'

/**
 * Shell preload — exposes the typed `window.multiworkAPI` bridge to the
 * React renderer (docs/SPRINT_1_SPEC_FOR_MUSE.md §MUSE-03.1).
 * The renderer never touches ipcRenderer directly.
 *
 * REV-01 [CRITICAL-01]: the IPC channel names are inlined as literals
 * below. Sandboxed preloads cannot require("./chunks/...") at runtime, so
 * this bundle must stay a single self-contained file — only TYPE-ONLY
 * imports from shared modules are allowed (erased at build time). Keep
 * these literals in sync with `IPC_CHANNELS` in src/shared/types.ts.
 */
const CH = {
  ACCOUNTS_LIST: 'accounts:list',
  ACCOUNTS_ADD: 'accounts:add',
  ACCOUNTS_SWITCH: 'accounts:switch',
  ACCOUNTS_REMOVE: 'accounts:remove',
  LAYOUT_SET_ASSISTANT_PANEL: 'layout:set-assistant-panel',
  LAYOUT_SET_SIDEBAR_WIDTH: 'layout:set-sidebar-width',
  LAYOUT_SET_CHAT_VISIBLE: 'layout:set-chat-visible',
  CHAT_UNREAD_UPDATED: 'chat:unread-updated',
  ASSISTANT_NEW_DIRECTIVE: 'assistant:new-directive',
  ASSISTANT_GET_BOSS_RULE: 'assistant:get-boss-rule',
  ASSISTANT_SET_BOSS_RULE: 'assistant:set-boss-rule',
  ASSISTANT_GET_STATE: 'assistant:get-state',
  ASSISTANT_SAVE_TODOS: 'assistant:save-todos',
  ASSISTANT_SAVE_EVENTS: 'assistant:save-events',
  LINE_GET_STATUS: 'line:get-status',
  LINE_PICK_EXTENSION_DIR: 'line:pick-extension-dir',
  KAKAO_GET_STATUS: 'kakao:get-status',
  KAKAO_LAUNCH: 'kakao:launch',
  KAKAO_DOCK: 'kakao:dock',
  KAKAO_UNDOCK: 'kakao:undock'
} as const

const api: MultiWorkAPI = {
  listAccounts: () => ipcRenderer.invoke(CH.ACCOUNTS_LIST),
  addAccount: (payload: AddAccountPayload) =>
    ipcRenderer.invoke(CH.ACCOUNTS_ADD, payload),
  switchAccount: (payload: SwitchAccountPayload) =>
    ipcRenderer.invoke(CH.ACCOUNTS_SWITCH, payload),
  removeAccount: (payload: RemoveAccountPayload) =>
    ipcRenderer.invoke(CH.ACCOUNTS_REMOVE, payload),
  setAssistantPanel: (payload: SetAssistantPanelPayload) =>
    ipcRenderer.invoke(CH.LAYOUT_SET_ASSISTANT_PANEL, payload),
  setSidebarWidth: (payload: SetSidebarWidthPayload) =>
    ipcRenderer.invoke(CH.LAYOUT_SET_SIDEBAR_WIDTH, payload),
  setChatVisible: (payload: SetChatVisiblePayload) =>
    ipcRenderer.invoke(CH.LAYOUT_SET_CHAT_VISIBLE, payload),
  getBossRule: () => ipcRenderer.invoke(CH.ASSISTANT_GET_BOSS_RULE),
  setBossRule: (rule: BossWatchRule) =>
    ipcRenderer.invoke(CH.ASSISTANT_SET_BOSS_RULE, rule),
  getAssistantState: () => ipcRenderer.invoke(CH.ASSISTANT_GET_STATE),
  saveTodos: (todos: TodoItem[]) =>
    ipcRenderer.invoke(CH.ASSISTANT_SAVE_TODOS, todos),
  saveEvents: (events: ScheduleEvent[]) =>
    ipcRenderer.invoke(CH.ASSISTANT_SAVE_EVENTS, events),
  getLineStatus: () => ipcRenderer.invoke(CH.LINE_GET_STATUS),
  pickLineExtensionDir: () => ipcRenderer.invoke(CH.LINE_PICK_EXTENSION_DIR),
  getKakaoStatus: () => ipcRenderer.invoke(CH.KAKAO_GET_STATUS),
  launchKakao: () => ipcRenderer.invoke(CH.KAKAO_LAUNCH),
  dockKakao: () => ipcRenderer.invoke(CH.KAKAO_DOCK),
  undockKakao: () => ipcRenderer.invoke(CH.KAKAO_UNDOCK),

  onUnreadUpdated: (callback: (payload: UnreadUpdatedPayload) => void) => {
    const listener = (_event: IpcRendererEvent, payload: UnreadUpdatedPayload) =>
      callback(payload)
    ipcRenderer.on(CH.CHAT_UNREAD_UPDATED, listener)
    return () => {
      ipcRenderer.removeListener(CH.CHAT_UNREAD_UPDATED, listener)
    }
  },

  onNewDirective: (callback: (payload: NewDirectivePayload) => void) => {
    const listener = (_event: IpcRendererEvent, payload: NewDirectivePayload) =>
      callback(payload)
    ipcRenderer.on(CH.ASSISTANT_NEW_DIRECTIVE, listener)
    return () => {
      ipcRenderer.removeListener(CH.ASSISTANT_NEW_DIRECTIVE, listener)
    }
  }
}

contextBridge.exposeInMainWorld('multiworkAPI', api)
