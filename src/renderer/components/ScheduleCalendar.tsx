import { useAccountsStore } from '../store/useAccountsStore'
import { useAssistantStore } from '../store/useAssistantStore'

/** Tab 3: events & schedule extracted from boss directives. */
export default function ScheduleCalendar() {
  const events = useAssistantStore((s) => s.events)
  const todos = useAssistantStore((s) => s.todos)
  const switchTo = useAccountsStore((s) => s.switchTo)

  const withDue = todos.filter((t) => t.dueAt && !t.completed)

  if (events.length === 0 && withDue.length === 0) {
    return (
      <div className="p-4 text-[13px] leading-relaxed text-shell-dim">
        Chưa có lịch hẹn nào. Khi Sếp nhắn thời gian họp/hẹn trong nhóm chat,
        sự kiện sẽ tự động xuất hiện ở đây kèm chuông nhắc trước 15–30 phút.
        <div className="mt-3 text-[12px]">
          (Trích xuất lịch bằng AI sẽ nối ở Sprint 3 — hiện tại các việc có hạn
          chót trong tab ✅ sẽ được nhắc tại đây.)
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 overflow-y-auto p-3">
      {events.map((ev) => (
        <article
          key={ev.id}
          className="rounded-xl border border-shell-border bg-shell-panel2 p-3"
        >
          <h4 className="text-[13px] font-medium text-shell-text">{ev.title}</h4>
          <p className="mt-1 text-[12px] text-shell-dim">
            🕐 {new Date(ev.startTime).toLocaleString('vi-VN')}
            {ev.endTime
              ? ` → ${new Date(ev.endTime).toLocaleTimeString('vi-VN')}`
              : ''}
          </p>
          <p className="mt-0.5 text-[12px] text-shell-dim">
            🔔 Nhắc trước {ev.reminderMinutesBefore} phút
            {ev.syncedToExternalCalendar ? ' • Đã đồng bộ lịch ngoài' : ''}
          </p>
          {ev.sourceAccountId && (
            <button
              onClick={() => void switchTo(ev.sourceAccountId)}
              className="mt-1 text-[12px] text-shell-dim underline-offset-2 hover:text-shell-accent hover:underline"
            >
              Nhảy tới chat gốc →
            </button>
          )}
        </article>
      ))}
      {withDue.map((t) => (
        <article
          key={t.id}
          className="rounded-xl border border-shell-border bg-shell-panel2 p-3"
        >
          <h4 className="text-[13px] font-medium text-shell-text">{t.title}</h4>
          <p className="mt-1 text-[12px] text-shell-dim">
            ⏰ Hạn chót: {new Date(t.dueAt as string).toLocaleString('vi-VN')} •{' '}
            {t.chatRoomName}
          </p>
        </article>
      ))}
    </div>
  )
}
