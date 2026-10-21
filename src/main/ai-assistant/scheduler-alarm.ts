import { Notification } from 'electron'
import type { AlarmPayload } from '../../shared/types'
import type { JsonStore } from '../store'

const CHECK_INTERVAL_MS = 30_000
/** Todos are reminded this long before their deadline (spec MUSE-07). */
const TODO_REMIND_BEFORE_MS = 15 * 60_000

/**
 * SchedulerAlarm (Sprint 3, MUSE-07) — background reminder loop.
 *
 * Every 30 seconds it scans the persisted schedule events and the
 * incomplete To-Dos with a deadline. When the current time enters an
 * item's reminder window (event: `startTime - reminderMinutesBefore`;
 * todo: `dueAt - 15min`) it fires ONE OS desktop notification per item
 * instance (tracked in `notifiedIds`) and forwards the alarm to the
 * renderer so the assistant panel can show a banner.
 */
export class SchedulerAlarm {
  private timer: NodeJS.Timeout | null = null
  private readonly notifiedIds = new Set<string>()

  constructor(
    private readonly store: JsonStore,
    private readonly onAlarm: (payload: AlarmPayload) => void
  ) {}

  start(): void {
    if (this.timer) return
    this.check()
    this.timer = setInterval(() => this.check(), CHECK_INTERVAL_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private check(): void {
    if (!Notification.isSupported()) return
    const now = Date.now()

    for (const ev of this.store.data.events) {
      const start = Date.parse(ev.startTime)
      if (Number.isNaN(start)) continue
      const key = `event:${ev.id}:${ev.startTime}`
      const remindAt = start - (ev.reminderMinutesBefore ?? 15) * 60_000
      // Fire inside the reminder window, up to 15 min after the start so a
      // freshly launched app still catches an imminent meeting once.
      if (now >= remindAt && now <= start + 15 * 60_000) {
        this.fire(key, ev.title, start, '🗓️ Lịch hẹn')
      }
    }

    for (const todo of this.store.data.todos) {
      if (todo.completed || !todo.dueAt) continue
      const due = Date.parse(todo.dueAt)
      if (Number.isNaN(due)) continue
      const key = `todo:${todo.id}:${todo.dueAt}`
      const remindAt = due - TODO_REMIND_BEFORE_MS
      if (now >= remindAt && now <= due + 30 * 60_000) {
        this.fire(key, todo.title, due, '⏰ Việc cần làm')
      }
    }

    // Keep the dedupe set bounded (old keys can never fire again anyway).
    if (this.notifiedIds.size > 1000) this.notifiedIds.clear()
  }

  private fire(key: string, title: string, atMs: number, kind: string): void {
    if (this.notifiedIds.has(key)) return
    this.notifiedIds.add(key)
    const time = new Date(atMs).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    })
    const body = `${kind}: ${title} — ${time}`
    new Notification({ title: '⏰ Nhắc việc MultiWork', body }).show()
    this.onAlarm({ title: '⏰ Nhắc việc MultiWork', body })
  }
}
