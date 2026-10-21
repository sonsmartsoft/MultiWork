import { useEffect, useState } from 'react'
import {
  DockResult,
  KakaoStatus,
  LAYOUT,
  LineStatus,
  SERVICE_CATALOG,
  ServiceType
} from '../shared/types'
import AddServiceModal from './components/AddServiceModal'
import AISettingsModal from './components/AISettingsModal'
import BossWatchlistModal from './components/BossWatchlistModal'
import RightAssistantPanel from './components/RightAssistantPanel'
import Sidebar from './components/Sidebar'
import { useAccountsStore } from './store/useAccountsStore'
import { useAssistantStore } from './store/useAssistantStore'

/**
 * MultiWork shell — 3-column workspace:
 *   [Sidebar] [TopBar + Chat viewport] [AI Assistant panel]
 *
 * The chat area itself is a native WebContentsView positioned by the Main
 * Process over the center column; this React tree renders everything around
 * it and keeps Main in sync about the geometry (assistant panel, sidebar
 * width) and about modal visibility (Acceptance Criteria #2).
 */
const barButtonClass =
  'rounded-lg bg-shell-panel2 px-2.5 py-1 text-[12px] text-shell-text hover:ring-1 hover:ring-shell-accentDim'

/**
 * Sprint 2: contextual controls in the top bar for the two non-web
 * integrations — LINE (Chrome extension) and KakaoTalk (native window).
 */
function NativeServiceBar({ serviceType }: { serviceType: ServiceType }) {
  const [lineStatus, setLineStatus] = useState<LineStatus | null>(null)
  const [kakaoStatus, setKakaoStatus] = useState<KakaoStatus | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (serviceType === 'line-personal') {
      void window.multiworkAPI.getLineStatus().then(setLineStatus)
    } else if (serviceType === 'kakaotalk-personal') {
      void window.multiworkAPI.getKakaoStatus().then(setKakaoStatus)
    }
  }, [serviceType])

  if (serviceType === 'line-personal') {
    return (
      <span className="app-no-drag flex items-center gap-2">
        <span className="text-[12px] text-shell-dim">
          {lineStatus?.extensionId
            ? 'LINE Extension: đã nạp ✅'
            : lineStatus?.available
              ? 'LINE Extension: đã có thư mục'
              : 'LINE Extension: chưa có thư mục'}
        </span>
        <button
          className={barButtonClass}
          onClick={() => {
            void window.multiworkAPI
              .pickLineExtensionDir()
              .then(setLineStatus)
          }}
        >
          📁 Thư mục Extension LINE
        </button>
      </span>
    )
  }

  if (serviceType === 'kakaotalk-personal') {
    const run = async (fn: () => Promise<DockResult>): Promise<void> => {
      const r = await fn()
      setNote(r.ok ? '✅' : `⚠️ ${r.reason ?? 'lỗi'}`)
      setKakaoStatus(await window.multiworkAPI.getKakaoStatus())
    }
    return (
      <span className="app-no-drag flex items-center gap-2">
        <span className="text-[12px] text-shell-dim">
          {kakaoStatus
            ? kakaoStatus.installed
              ? 'KakaoTalk: đã cài ✅'
              : 'KakaoTalk: chưa cài'
            : 'KakaoTalk: ...'}{' '}
          {note}
        </span>
        <button
          className={barButtonClass}
          onClick={() => void run(() => window.multiworkAPI.launchKakao())}
        >
          Mở KakaoTalk
        </button>
        <button
          className={barButtonClass}
          onClick={() => void run(() => window.multiworkAPI.dockKakao())}
        >
          Ghép cửa sổ
        </button>
        <button
          className={barButtonClass}
          onClick={() => void run(() => window.multiworkAPI.undockKakao())}
        >
          Thả cửa sổ
        </button>
      </span>
    )
  }

  return null
}

export default function App() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [watchlistOpen, setWatchlistOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  const accounts = useAccountsStore((s) => s.accounts)
  const activeId = useAccountsStore((s) => s.activeId)
  const initAccounts = useAccountsStore((s) => s.init)

  const panelOpen = useAssistantStore((s) => s.panelOpen)
  const setPanelOpen = useAssistantStore((s) => s.setPanelOpen)
  const initAssistant = useAssistantStore((s) => s.init)

  const active = accounts.find((a) => a.id === activeId) ?? null
  const modalOpen = addOpen || watchlistOpen || aiOpen

  useEffect(() => {
    void initAccounts()
    void initAssistant()
  }, [initAccounts, initAssistant])

  // Geometry sync -> Main resizes the active chat WebContentsView.
  useEffect(() => {
    void window.multiworkAPI.setAssistantPanel({
      isOpen: panelOpen,
      width: LAYOUT.ASSISTANT_PANEL_WIDTH
    })
  }, [panelOpen])

  useEffect(() => {
    void window.multiworkAPI.setSidebarWidth({
      width: sidebarExpanded
        ? LAYOUT.SIDEBAR_EXPANDED_WIDTH
        : LAYOUT.SIDEBAR_COLLAPSED_WIDTH
    })
  }, [sidebarExpanded])

  // Modals must never be covered by the native chat view.
  useEffect(() => {
    void window.multiworkAPI.setChatVisible({ visible: !modalOpen })
  }, [modalOpen])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-shell-bg text-shell-text">
      {/* Top bar (44px — the chat viewport starts right below it) */}
      <header
        className="app-drag flex shrink-0 items-center gap-3 border-b border-shell-border bg-shell-panel px-3"
        style={{ height: LAYOUT.TOP_BAR_HEIGHT }}
      >
        <span className="text-[13px] font-bold tracking-wide text-shell-accent">
          MultiWork
        </span>
        {active && (
          <span className="flex items-center gap-2 text-[13px] text-shell-dim">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: SERVICE_CATALOG[active.serviceType].color
              }}
            />
            {active.displayName}
            {active.unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {active.unreadCount} chưa đọc
              </span>
            )}
          </span>
        )}
        {active && <NativeServiceBar serviceType={active.serviceType} />}
        <div className="ml-auto">
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="app-no-drag rounded-lg bg-shell-panel2 px-3 py-1.5 text-[12.5px] text-shell-text hover:ring-1 hover:ring-shell-accentDim"
          >
            {panelOpen ? 'Ẩn trợ lý AI' : 'Hiện trợ lý AI 🤖'}
          </button>
        </div>
      </header>

      {/* Body row */}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          expanded={sidebarExpanded}
          onToggleExpand={() => setSidebarExpanded((v) => !v)}
          onAdd={() => setAddOpen(true)}
          onOpenWatchlist={() => setWatchlistOpen(true)}
        />

        {/* Center column — the native chat view floats over this area. */}
        <main className="relative min-w-0 flex-1 bg-shell-bg">
          {accounts.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="text-4xl">💬</div>
              <h1 className="text-lg font-semibold">
                Tất cả ứng dụng chat, trong một cửa sổ
              </h1>
              <p className="max-w-md text-[13.5px] leading-relaxed text-shell-dim">
                Thêm tài khoản Zalo, Messenger, Naver Works, Telegram... ở cột
                trái. Đăng nhập một lần — MultiWork giữ phiên vĩnh viễn, không
                bao giờ bắt đăng nhập lại.
              </p>
              <button
                onClick={() => setAddOpen(true)}
                className="mt-1 rounded-lg bg-shell-accent px-4 py-2 text-sm font-semibold text-black"
              >
                + Thêm tài khoản đầu tiên
              </button>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] text-shell-dim">
              Đang tải {active ? active.displayName : 'ứng dụng chat'}...
            </div>
          )}
        </main>

        {panelOpen && (
          <RightAssistantPanel
            onOpenWatchlist={() => setWatchlistOpen(true)}
            onOpenAISettings={() => setAiOpen(true)}
          />
        )}
      </div>

      {addOpen && <AddServiceModal onClose={() => setAddOpen(false)} />}
      {watchlistOpen && (
        <BossWatchlistModal onClose={() => setWatchlistOpen(false)} />
      )}
      {aiOpen && <AISettingsModal onClose={() => setAiOpen(false)} />}
    </div>
  )
}
