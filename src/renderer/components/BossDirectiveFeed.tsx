import { SERVICE_CATALOG } from '../../shared/types'
import { useAccountsStore } from '../store/useAccountsStore'
import { useAssistantStore } from '../store/useAssistantStore'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

/** Tab 1: captured boss / @mention messages with their translation. */
export default function BossDirectiveFeed() {
  const directives = useAssistantStore((s) => s.directives)
  const switchTo = useAccountsStore((s) => s.switchTo)

  if (directives.length === 0) {
    return (
      <div className="p-4 text-[13px] leading-relaxed text-shell-dim">
        Chưa có chỉ thị nào. Khi Sếp nhắn tin hoặc ai đó <b>@tag</b> bạn trong
        Zalo, Messenger, Naver Works, Telegram... tin nhắn sẽ tự động hiện ở
        đây kèm bản dịch.
        <div className="mt-3">
          Nhớ thêm tên Sếp và từ khóa @mention của bạn trong mục{' '}
          <b>🎯 Sếp &amp; @mention</b> ở cột trái.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 overflow-y-auto p-3">
      {directives.map((d) => {
        const entry = SERVICE_CATALOG[d.platform]
        return (
          <article
            key={d.id}
            className="rounded-xl border border-shell-border bg-shell-panel2 p-3"
          >
            <header className="mb-1 flex items-center gap-2">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: entry.color }}
              >
                {entry.glyph}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-shell-text">
                {d.title}
              </span>
              <span className="shrink-0 text-[11px] text-shell-dim">
                {formatTime(d.timestamp)}
              </span>
            </header>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-shell-text">
              {d.translatedBody}
            </p>
            {d.translatedBody !== d.body && (
              <p className="mt-1 whitespace-pre-wrap border-l-2 border-shell-border pl-2 text-[12px] leading-relaxed text-shell-dim">
                Gốc: {d.body}
              </p>
            )}
            <footer className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-shell-accent/15 px-2 py-0.5 text-[11px] font-medium text-shell-accent">
                {d.matchedBy === 'boss'
                  ? 'Từ Sếp'
                  : d.matchedBy === 'mention'
                    ? `@tag ${d.matchedKeyword ?? ''}`
                    : 'Sếp + @tag'}
              </span>
              <button
                onClick={() => void switchTo(d.accountId)}
                className="ml-auto text-[12px] text-shell-dim underline-offset-2 hover:text-shell-accent hover:underline"
              >
                Nhảy tới chat gốc →
              </button>
            </footer>
          </article>
        )
      })}
    </div>
  )
}
