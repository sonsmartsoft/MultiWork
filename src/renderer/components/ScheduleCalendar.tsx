import { useState } from 'react'
import type { ScheduleEvent } from '../../shared/types'
import { useAccountsStore } from '../store/useAccountsStore'
import { useAssistantStore } from '../store/useAssistantStore'

/** YYYYMMDDTHHMMSSZ for the Google Calendar template URL. */
function gcalDate(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

function gcalUrl(ev: ScheduleEvent): string {
  const start = new Date(ev.startTime)
  const end = ev.endTime
    ? new Date(ev.endTime)
    : new Date(start.getTime() + 60 * 60_000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${gcalDate(start)}/${gcalDate(end)}`,
    details: 'Tạo từ MultiWork'
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Local `datetime-local` input value for a Date. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Tab 3: schedule & events — auto-extracted from boss directives
 * (Sprint 3, MUSE-06.B), manually managed here (MUSE-07), and reminded
 * by the background SchedulerAlarm.
 */
export default function ScheduleCalendar() {
  const events = useAssistantStore((s) => s.events)
  const todos = useAssistantStore((s) => s.todos)
  const addEvent = useAssistantStore((s) => s.addEvent)
  const removeEvent = useAssistantStore((s) => s.removeEvent)
  const switchTo = useAccountsStore((s) => s.switchTo)

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [startLocal, setStartLocal] = useState(() => {
    const d = new Date(Date.now() + 60 * 60_000)
    d.setMinutes(0, 0, 0)
    return toLocalInput(d)
  })
  const [reminder, setReminder] = useState(15)

  const withDue = todos.filter((t) => t.dueAt && !t.completed)
  const sorted = [...events].sort(
    (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)
  )

  const submit = () => {
    const trimmed = title.trim()
    const start = new Date(startLocal)
    if (!trimmed || Number.isNaN(start.getTime())) return
    addEvent({
      id: `manual-${Date.now()}`,
      title: trimmed,
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + 60 * 60_000).toISOString(),
      reminderMinutesBefore: reminder,
      sourceAccountId: '',
      syncedToExternalCalendar: false
    })
    setTitle('')
    setShowForm(false)
  }

  return (
    <div className="space-y-2 overflow-y-auto p-3">
      <button
        onClick={() => setShowForm((v) => !v)}
        className="w-full rounded-lg border border-shell-accentDim bg-shell-panel2 px-3 py-2 text-[12.5px] font-medium text-shell-text hover:ring-1 hover:ring-shell-accent"
      >
        + Thêm lịch hẹn thủ công
      </button>

      {showForm && (
        <div className="space-y-2 rounded-xl border border-shell-border bg-shell-panel2 p-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề lịch hẹn / cuộc họp"
            className="w-full rounded-lg border border-shell-border bg-shell-bg px-3 py-2 text-sm text-shell-text outline-none focus:border-shell-accentDim"
          />
          <input
            type="datetime-local"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
            className="w-full rounded-lg border border-shell-border bg-shell-bg px-3 py-2 text-sm text-shell-text outline-none focus:border-shell-accentDim"
          />
          <label className="flex items-center gap-2 text-[12.5px] text-shell-dim">
            Nhắc trước
            <select
              value={reminder}
              onChange={(e) => setReminder(Number(e.target.value))}
              className="rounded-lg border border-shell-border bg-shell-bg px-2 py-1.5 text-[12.5px] text-shell-text outline-none"
            >
              <option value={5}>5 phút</option>
              <option value={15}>15 phút</option>
              <option value={30}>30 phút</option>
              <option value={60}>60 phút</option>
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-1.5 text-[12.5px] text-shell-dim hover:bg-shell-panel"
            >
              Hủy
            </button>
            <button
              onClick={submit}
              disabled={!title.trim()}
              className="rounded-lg bg-shell-accent px-3 py-1.5 text-[12.5px] font-semibold text-black disabled:opacity-40"
            >
              Lưu lịch hẹn
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && withDue.length === 0 && !showForm && (
        <p className="p-1 text-[13px] leading-relaxed text-shell-dim">
          Chưa có lịch hẹn nào. Khi Sếp nhắn thời gian họp/hẹn (kể cả tiếng
          Hàn/Nhật/Anh), sự kiện sẽ tự động xuất hiện ở đây kèm chuông nhắc —
          hoặc anh tự thêm bằng nút ở trên.
        </p>
      )}

      {sorted.map((ev) => (
        <article
          key={ev.id}
          className="rounded-xl border border-shell-border bg-shell-panel2 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[13px] font-medium text-shell-text">
              {ev.title}
            </h4>
            <button
              onClick={() => removeEvent(ev.id)}
              title="Xóa sự kiện"
              className="rounded-md px-1.5 py-0.5 text-shell-dim hover:bg-red-500/10 hover:text-red-300"
            >
              ✕
            </button>
          </div>
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
          <div className="mt-1.5 flex flex-wrap gap-3">
            <button
              onClick={() =>
                void window.multiworkAPI.openExternal(gcalUrl(ev))
              }
              className="text-[12px] text-shell-dim underline-offset-2 hover:text-shell-accent hover:underline"
            >
              📅 Thêm vào Google Calendar
            </button>
            {ev.sourceAccountId && (
              <button
                onClick={() => void switchTo(ev.sourceAccountId)}
                className="text-[12px] text-shell-dim underline-offset-2 hover:text-shell-accent hover:underline"
              >
                Nhảy tới chat gốc →
              </button>
            )}
          </div>
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
