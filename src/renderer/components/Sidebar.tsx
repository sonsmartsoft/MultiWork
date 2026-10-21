import { SERVICE_CATALOG } from '../../shared/types'
import { useAccountsStore } from '../store/useAccountsStore'

interface SidebarProps {
  expanded: boolean
  onToggleExpand: () => void
  onAdd: () => void
  onOpenWatchlist: () => void
}

/**
 * Left column: personal chat accounts (multiple accounts per service are
 * supported), each with a live unread badge fed by the interceptor pipeline.
 */
export default function Sidebar({
  expanded,
  onToggleExpand,
  onAdd,
  onOpenWatchlist
}: SidebarProps) {
  const accounts = useAccountsStore((s) => s.accounts)
  const activeId = useAccountsStore((s) => s.activeId)
  const switchTo = useAccountsStore((s) => s.switchTo)
  const remove = useAccountsStore((s) => s.remove)

  return (
    <aside
      className="flex h-full flex-col border-r border-shell-border bg-shell-panel"
      style={{ width: expanded ? 240 : 68 }}
    >
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {accounts.map((account) => {
          const entry = SERVICE_CATALOG[account.serviceType]
          const isActive = account.id === activeId
          return (
            <div key={account.id} className="group relative">
              <button
                onClick={() => void switchTo(account.id)}
                title={account.displayName}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                  isActive
                    ? 'bg-shell-panel2 ring-1 ring-shell-accentDim'
                    : 'hover:bg-shell-panel2'
                }`}
              >
                <span className="relative shrink-0">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold text-white"
                    style={{ backgroundColor: entry.color }}
                  >
                    {entry.glyph}
                  </span>
                  {account.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                      {account.unreadCount > 99 ? '99+' : account.unreadCount}
                    </span>
                  )}
                </span>
                {expanded && (
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-shell-text">
                      {account.displayName}
                    </span>
                    <span className="block truncate text-[11px] text-shell-dim">
                      {entry.label}
                    </span>
                  </span>
                )}
              </button>
              {expanded && (
                <button
                  onClick={() => void remove(account.id)}
                  title="Xóa tài khoản (xóa cả dữ liệu phiên)"
                  className="absolute right-1 top-1 hidden rounded-md px-1.5 py-0.5 text-[11px] text-shell-dim hover:bg-red-500/15 hover:text-red-400 group-hover:block"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}

        <button
          onClick={onAdd}
          title="Thêm tài khoản chat"
          className={`flex w-full items-center gap-3 rounded-xl border border-dashed border-shell-border px-2 py-2 text-shell-dim transition-colors hover:border-shell-accentDim hover:text-shell-accent ${
            expanded ? '' : 'justify-center'
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-current text-lg">
            +
          </span>
          {expanded && <span className="text-[13px]">Thêm tài khoản</span>}
        </button>
      </div>

      <div className="space-y-1 border-t border-shell-border p-2">
        <button
          onClick={onOpenWatchlist}
          title="Cài đặt Sếp & từ khóa @mention"
          className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-shell-dim hover:bg-shell-panel2 hover:text-shell-text ${
            expanded ? '' : 'justify-center'
          }`}
        >
          <span className="text-base">🎯</span>
          {expanded && <span className="text-[13px]">Sếp &amp; @mention</span>}
        </button>
        <button
          onClick={onToggleExpand}
          title={expanded ? 'Thu gọn' : 'Mở rộng'}
          className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-shell-dim hover:bg-shell-panel2 hover:text-shell-text ${
            expanded ? '' : 'justify-center'
          }`}
        >
          <span className="text-base">{expanded ? '◀' : '▶'}</span>
          {expanded && <span className="text-[13px]">Thu gọn</span>}
        </button>
      </div>
    </aside>
  )
}
