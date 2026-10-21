/**
 * MultiWork — Shared contracts between Main Process, Preload and Renderer.
 *
 * Single source of truth for:
 *  - Domain types (AccountInstance, BossWatchRule, TodoItem, ScheduleEvent, ...)
 *  - The fixed IPC channel names (see docs/SPRINT_1_SPEC_FOR_MUSE.md §2)
 *  - The service catalog (URLs / integration kind per chat platform)
 *  - Layout constants used by both the layout engine (Main) and the shell UI (Renderer)
 */

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export type ServiceType =
  | 'zalo'
  | 'messenger'
  | 'naver-works'
  | 'telegram'
  | 'line-personal'
  | 'kakaotalk-personal'
  | 'whatsapp'
  | 'wechat'
  | 'slack'
  | 'discord'
  | 'teams'
  | 'custom-web'

/** How a service is hosted inside MultiWork. */
export type ServiceKind = 'web' | 'extension' | 'native' | 'custom'

export interface ServiceCatalogEntry {
  serviceType: ServiceType
  label: string
  /** Default URL for web services. Undefined for extension/native stubs. */
  url?: string
  kind: ServiceKind
  /** Brand color used for the avatar placeholder in the Sidebar. */
  color: string
  /** Short text shown inside the avatar placeholder (1-2 chars). */
  glyph: string
}

export const SERVICE_CATALOG: Record<ServiceType, ServiceCatalogEntry> = {
  zalo: {
    serviceType: 'zalo',
    label: 'Zalo',
    url: 'https://chat.zalo.me',
    kind: 'web',
    color: '#0068ff',
    glyph: 'Z'
  },
  messenger: {
    serviceType: 'messenger',
    label: 'Messenger',
    url: 'https://www.messenger.com',
    kind: 'web',
    color: '#0084ff',
    glyph: 'M'
  },
  'naver-works': {
    serviceType: 'naver-works',
    label: 'Naver Works',
    url: 'https://talk.worksmobile.com',
    kind: 'web',
    color: '#00c73c',
    glyph: 'N'
  },
  telegram: {
    serviceType: 'telegram',
    label: 'Telegram',
    url: 'https://web.telegram.org/a/',
    kind: 'web',
    color: '#229ed9',
    glyph: 'T'
  },
  'line-personal': {
    serviceType: 'line-personal',
    label: 'LINE (Cá nhân)',
    kind: 'extension',
    color: '#06c755',
    glyph: 'L'
  },
  'kakaotalk-personal': {
    serviceType: 'kakaotalk-personal',
    label: 'KakaoTalk (Cá nhân)',
    kind: 'native',
    color: '#fee500',
    glyph: 'K'
  },
  whatsapp: {
    serviceType: 'whatsapp',
    label: 'WhatsApp',
    url: 'https://web.whatsapp.com',
    kind: 'web',
    color: '#25d366',
    glyph: 'W'
  },
  wechat: {
    serviceType: 'wechat',
    label: 'WeChat',
    // Tencent blocks Web WeChat logins for many accounts ("service not
    // available for your account"), so WeChat is coordinated as a NATIVE
    // desktop window like KakaoTalk. The web URL stays as a fallback link
    // inside the guide page for the accounts Tencent still allows.
    url: 'https://web.wechat.com',
    kind: 'native',
    color: '#07c160',
    glyph: 'We'
  },
  slack: {
    serviceType: 'slack',
    label: 'Slack',
    url: 'https://app.slack.com/client',
    kind: 'web',
    color: '#611f69',
    glyph: 'S'
  },
  discord: {
    serviceType: 'discord',
    label: 'Discord',
    url: 'https://discord.com/app',
    kind: 'web',
    color: '#5865f2',
    glyph: 'D'
  },
  teams: {
    serviceType: 'teams',
    label: 'Microsoft Teams',
    url: 'https://teams.microsoft.com',
    kind: 'web',
    color: '#4b53bc',
    glyph: 'T'
  },
  'custom-web': {
    serviceType: 'custom-web',
    label: 'Web tùy chỉnh',
    kind: 'custom',
    color: '#5b6472',
    glyph: '+'
  }
}

export const SERVICE_TYPES = Object.keys(SERVICE_CATALOG) as ServiceType[]

// ---------------------------------------------------------------------------
// Domain types (docs/ARCHITECTURE.md §4)
// ---------------------------------------------------------------------------

export interface AccountInstance {
  id: string // Unique UUID, e.g. "9f8a7b..."
  serviceType: ServiceType
  displayName: string // Friendly name, e.g. "Zalo Cá nhân"
  workspaceId: string // Owning workspace
  partitionName: string // "persist:acc_<id>"
  frozenUserAgent: string // User-Agent frozen for the account's lifetime
  /** Landing URL actually loaded (catalog default or user-provided custom URL). */
  homeUrl: string
  unreadCount: number
  isMuted: boolean
  keepAliveIntervalMinutes: number // Default: 15
  createdAt: string // ISO timestamp
}

export interface BossWatchRule {
  id: string
  myMentionKeywords: string[] // e.g. ["@Son", "@Sơn", "손님", "Sơn ơi"]
  bossSenderNames: string[] // e.g. ["김부장님", "Director Kim", "Sếp Hùng"]
  targetLanguage: string // Default: "vi"
  autoCreateTodo: boolean
  autoCreateEvent: boolean
}

export const DEFAULT_BOSS_RULE: BossWatchRule = {
  id: 'default',
  myMentionKeywords: ['@all', '@All'],
  bossSenderNames: [],
  targetLanguage: 'vi',
  autoCreateTodo: true,
  autoCreateEvent: true
}

export interface TodoItem {
  id: string
  title: string
  originalMessage: string
  translatedMessage: string
  sourceAccountId: string
  sourcePlatform: ServiceType
  chatRoomName: string
  senderName: string
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'
  dueAt?: string // ISO timestamp
  completed: boolean
  createdAt: string // ISO timestamp
}

export interface ScheduleEvent {
  id: string
  title: string
  startTime: string // ISO 8601
  endTime?: string
  reminderMinutesBefore: number // e.g. 15
  sourceTodoId?: string
  sourceAccountId: string
  syncedToExternalCalendar: boolean
}

/** A captured boss/@mention message shown in the Boss Directive feed. */
export interface BossDirective {
  id: string
  accountId: string
  platform: ServiceType
  /** Notification title as captured (usually sender or group name). */
  title: string
  /** Raw message body as captured. */
  body: string
  /** Filled by the AI engine in Sprint 3; in Sprint 1 it mirrors `body`. */
  translatedBody: string
  timestamp: string // ISO timestamp
  matchedBy: 'mention' | 'boss' | 'mention+boss'
  matchedKeyword?: string
}

// ---------------------------------------------------------------------------
// AI engine (translation + smart task extraction)
// ---------------------------------------------------------------------------

/** AI settings as the renderer may see them — never contains the raw key. */
export interface AISettingsView {
  provider: 'gemini' | 'off'
  model: string
  autoTranslate: boolean
  smartExtract: boolean
  hasKey: boolean
}

export interface AISettingsUpdate {
  provider?: 'gemini' | 'off'
  model?: string
  autoTranslate?: boolean
  smartExtract?: boolean
  /** undefined = keep the stored key · '' = clear it · other = replace it. */
  apiKey?: string
}

export interface AITestResult {
  ok: boolean
  message: string
}

/** Alarm raised by the SchedulerAlarm (MUSE-07) and shown in the shell. */
export interface AlarmPayload {
  title: string
  body: string
}

/** Structured task info extracted from a directive by the AI engine. */
export interface AIExtraction {
  hasTask: boolean
  title?: string
  dueAt?: string // ISO timestamp
  priority?: TodoItem['priority']
}

// ---------------------------------------------------------------------------
// IPC contract (docs/SPRINT_1_SPEC_FOR_MUSE.md §2) — names are FIXED.
// Channels marked [extension] are additions by the Lead Developer, required to
// satisfy Acceptance Criteria #2 (modal must not be covered by the chat view)
// and the expandable Sidebar width in Spec §MUSE-02.1. They follow the same
// naming convention and are documented in docs/AI_COLLABORATION.md.
// ---------------------------------------------------------------------------

export const IPC_CHANNELS = {
  ACCOUNTS_LIST: 'accounts:list',
  ACCOUNTS_ADD: 'accounts:add',
  ACCOUNTS_SWITCH: 'accounts:switch',
  ACCOUNTS_REMOVE: 'accounts:remove',
  LAYOUT_SET_ASSISTANT_PANEL: 'layout:set-assistant-panel',
  CHAT_UNREAD_UPDATED: 'chat:unread-updated',
  CHAT_INCOMING_NOTIFICATION: 'chat:incoming-notification',
  ASSISTANT_NEW_DIRECTIVE: 'assistant:new-directive',
  // [extension] Sidebar collapsed (68px) / expanded (240px) width sync.
  LAYOUT_SET_SIDEBAR_WIDTH: 'layout:set-sidebar-width',
  // [extension] Hide/show the active chat view while a shell modal is open.
  LAYOUT_SET_CHAT_VISIBLE: 'layout:set-chat-visible',
  // [extension] Boss watchlist persistence (used by the Main-process filter).
  ASSISTANT_GET_BOSS_RULE: 'assistant:get-boss-rule',
  ASSISTANT_SET_BOSS_RULE: 'assistant:set-boss-rule',
  // [extension] REV-01 [HIGH-04]: durable assistant state (directives /
  // todos / events) persisted in the Main-process JsonStore.
  ASSISTANT_GET_STATE: 'assistant:get-state',
  ASSISTANT_SAVE_TODOS: 'assistant:save-todos',
  ASSISTANT_SAVE_EVENTS: 'assistant:save-events',
  // [extension] Full assistant-state push after background AI enrichment
  // (translation / smart extraction) mutated a directive or todo.
  ASSISTANT_STATE_UPDATED: 'assistant:state-updated',
  // [extension] Sprint 2 (MUSE-04): LINE Chrome-extension integration.
  LINE_GET_STATUS: 'line:get-status',
  LINE_PICK_EXTENSION_DIR: 'line:pick-extension-dir',
  // [extension] Sprint 2 (MUSE-05): KakaoTalk native window coordination.
  KAKAO_GET_STATUS: 'kakao:get-status',
  KAKAO_LAUNCH: 'kakao:launch',
  KAKAO_DOCK: 'kakao:dock',
  KAKAO_UNDOCK: 'kakao:undock',
  // [extension] WeChat native window coordination (same pattern as Kakao;
  // Web WeChat is blocked by Tencent for many accounts).
  WECHAT_GET_STATUS: 'wechat:get-status',
  WECHAT_LAUNCH: 'wechat:launch',
  WECHAT_DOCK: 'wechat:dock',
  WECHAT_UNDOCK: 'wechat:undock',
  // [extension] AI engine settings + connection test. The API key is held
  // ONLY by the Main process (encrypted at rest); it never crosses IPC.
  AI_GET_SETTINGS: 'ai:get-settings',
  AI_SET_SETTINGS: 'ai:set-settings',
  AI_TEST_CONNECTION: 'ai:test-connection',
  // [extension] Sprint 3 (MUSE-07): scheduler alarm push to the renderer,
  // and opening an external link (Google Calendar) in the system browser.
  ASSISTANT_ALARM: 'assistant:alarm',
  SHELL_OPEN_EXTERNAL: 'shell:open-external'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

// ---------------------------------------------------------------------------
// IPC payloads
// ---------------------------------------------------------------------------

export interface AddAccountPayload {
  serviceType: ServiceType
  displayName: string
  customUrl?: string
}

export interface SwitchAccountPayload {
  accountId: string
}

export interface RemoveAccountPayload {
  accountId: string
}

export interface SetAssistantPanelPayload {
  isOpen: boolean
  width: number
}

export interface SetSidebarWidthPayload {
  width: number
}

export interface SetChatVisiblePayload {
  visible: boolean
}

export interface UnreadUpdatedPayload {
  accountId: string
  unreadCount: number
}

export interface IncomingNotificationPayload {
  accountId: string
  title: string
  body: string
  timestamp: number // epoch ms, as captured in the chat web app
}

export interface NewDirectivePayload {
  directive: BossDirective
  todo?: TodoItem
  event?: ScheduleEvent
}

/** Snapshot of the assistant collections persisted by the Main Process. */
export interface AssistantStatePayload {
  directives: BossDirective[]
  todos: TodoItem[]
  events: ScheduleEvent[]
}

/** LINE extension integration state (Sprint 2, MUSE-04). */
export interface LineStatus {
  /** A LINE extension folder was found on disk. */
  available: boolean
  /** Folder the extension was (or would be) loaded from. */
  dir?: string
  /** Chrome extension id once loaded into a session. */
  extensionId?: string
  /** Official LINE id on the Chrome Web Store (for the guide page). */
  webStoreId: string
}

/** KakaoTalk native integration state (Sprint 2, MUSE-05). */
export interface KakaoStatus {
  installed: boolean
  installPath?: string
  platform: string
}

/** WeChat native integration state — same shape as KakaoStatus. */
export type WeChatStatus = KakaoStatus

export interface DockResult {
  ok: boolean
  reason?: string
}

// ---------------------------------------------------------------------------
// Layout constants (docs/SPRINT_1_SPEC_FOR_MUSE.md §MUSE-02.1)
// ---------------------------------------------------------------------------

export const LAYOUT = {
  SIDEBAR_COLLAPSED_WIDTH: 68,
  SIDEBAR_EXPANDED_WIDTH: 240,
  ASSISTANT_PANEL_WIDTH: 360,
  TOP_BAR_HEIGHT: 44,
  MIN_WINDOW_WIDTH: 1024,
  MIN_WINDOW_HEIGHT: 640,
  DEFAULT_WINDOW_WIDTH: 1440,
  DEFAULT_WINDOW_HEIGHT: 900
} as const

// ---------------------------------------------------------------------------
// Bridge API exposed to the Renderer by sidebar-preload.ts
// (`window.multiworkAPI`)
// ---------------------------------------------------------------------------

export interface MultiWorkAPI {
  listAccounts(): Promise<AccountInstance[]>
  addAccount(payload: AddAccountPayload): Promise<AccountInstance>
  switchAccount(payload: SwitchAccountPayload): Promise<void>
  removeAccount(payload: RemoveAccountPayload): Promise<boolean>
  setAssistantPanel(payload: SetAssistantPanelPayload): Promise<void>
  setSidebarWidth(payload: SetSidebarWidthPayload): Promise<void>
  setChatVisible(payload: SetChatVisiblePayload): Promise<void>
  getBossRule(): Promise<BossWatchRule>
  setBossRule(rule: BossWatchRule): Promise<void>
  /** REV-01 [HIGH-04]: load the persisted assistant collections. */
  getAssistantState(): Promise<AssistantStatePayload>
  /** REV-01 [HIGH-04]: persist the full todo list after a UI mutation. */
  saveTodos(todos: TodoItem[]): Promise<void>
  /** REV-01 [HIGH-04]: persist the full event list after a UI mutation. */
  saveEvents(events: ScheduleEvent[]): Promise<void>
  /** Sprint 2 (MUSE-04): LINE extension status / folder picker. */
  getLineStatus(): Promise<LineStatus>
  pickLineExtensionDir(): Promise<LineStatus>
  /** Sprint 2 (MUSE-05): KakaoTalk native window coordination. */
  getKakaoStatus(): Promise<KakaoStatus>
  launchKakao(): Promise<DockResult>
  dockKakao(): Promise<DockResult>
  undockKakao(): Promise<DockResult>
  getWeChatStatus(): Promise<WeChatStatus>
  launchWeChat(): Promise<DockResult>
  dockWeChat(): Promise<DockResult>
  undockWeChat(): Promise<DockResult>
  /** Subscribe to unread badge updates. Returns an unsubscribe function. */
  onUnreadUpdated(callback: (payload: UnreadUpdatedPayload) => void): () => void
  /** Subscribe to new boss directives. Returns an unsubscribe function. */
  onNewDirective(callback: (payload: NewDirectivePayload) => void): () => void
  /** AI engine settings (the API key itself never crosses this bridge). */
  getAISettings(): Promise<AISettingsView>
  setAISettings(update: AISettingsUpdate): Promise<AISettingsView>
  testAIConnection(): Promise<AITestResult>
  /** Subscribe to full-state refreshes after background AI enrichment. */
  onAssistantStateUpdated(
    callback: (payload: AssistantStatePayload) => void
  ): () => void
  /** Subscribe to scheduler alarms (MUSE-07). Returns an unsubscribe fn. */
  onAlarm(callback: (payload: AlarmPayload) => void): () => void
  /** Open a Google Calendar template link in the system browser. */
  openExternal(url: string): Promise<boolean>
}
