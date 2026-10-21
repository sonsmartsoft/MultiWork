import { useEffect, useState } from 'react'
import type { BossWatchRule } from '../../shared/types'
import { useAssistantStore } from '../store/useAssistantStore'

interface BossWatchlistModalProps {
  onClose: () => void
}

function toLines(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function toText(items: string[]): string {
  return items.join('\n')
}

/**
 * Boss & @mention settings: the user's own mention keywords and the boss
 * watchlist consumed by the Main-process directive filter.
 */
export default function BossWatchlistModal({ onClose }: BossWatchlistModalProps) {
  const bossRule = useAssistantStore((s) => s.bossRule)
  const saveBossRule = useAssistantStore((s) => s.saveBossRule)
  const [mentions, setMentions] = useState('')
  const [bosses, setBosses] = useState('')
  const [autoTodo, setAutoTodo] = useState(true)
  const [autoEvent, setAutoEvent] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!bossRule) return
    setMentions(toText(bossRule.myMentionKeywords))
    setBosses(toText(bossRule.bossSenderNames))
    setAutoTodo(bossRule.autoCreateTodo)
    setAutoEvent(bossRule.autoCreateEvent)
  }, [bossRule])

  const save = async () => {
    if (!bossRule) return
    setSaving(true)
    try {
      const rule: BossWatchRule = {
        ...bossRule,
        myMentionKeywords: toLines(mentions),
        bossSenderNames: toLines(bosses),
        autoCreateTodo: autoTodo,
        autoCreateEvent: autoEvent
      }
      await saveBossRule(rule)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[520px] max-w-[92vw] rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-shell-text">
            🎯 Sếp &amp; từ khóa @mention
          </h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-shell-dim hover:bg-shell-panel2 hover:text-shell-text"
          >
            ✕
          </button>
        </div>

        <label className="block text-[12px] font-medium text-shell-dim">
          Từ khóa khi Sếp @tag bạn (mỗi dòng một từ khóa)
        </label>
        <textarea
          value={mentions}
          onChange={(e) => setMentions(e.target.value)}
          rows={4}
          placeholder={'@Son\n@Sơn\n손님\nSơn ơi'}
          className="mt-1 w-full resize-none rounded-lg border border-shell-border bg-shell-bg px-3 py-2 text-sm text-shell-text outline-none focus:border-shell-accentDim"
        />

        <label className="mt-4 block text-[12px] font-medium text-shell-dim">
          Danh sách Sếp / Quản lý (tên hiển thị trong các app chat, mỗi dòng một
          tên)
        </label>
        <textarea
          value={bosses}
          onChange={(e) => setBosses(e.target.value)}
          rows={4}
          placeholder={'김부장님\nDirector Kim\nSếp Hùng'}
          className="mt-1 w-full resize-none rounded-lg border border-shell-border bg-shell-bg px-3 py-2 text-sm text-shell-text outline-none focus:border-shell-accentDim"
        />

        <div className="mt-4 space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-shell-text">
            <input
              type="checkbox"
              checked={autoTodo}
              onChange={(e) => setAutoTodo(e.target.checked)}
              className="h-4 w-4 accent-amber-400"
            />
            Tự động tạo việc cần làm khi phát hiện chỉ thị giao việc
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-shell-text">
            <input
              type="checkbox"
              checked={autoEvent}
              onChange={(e) => setAutoEvent(e.target.checked)}
              className="h-4 w-4 accent-amber-400"
            />
            Tự động tạo lịch hẹn khi phát hiện thời gian họp/hẹn
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-shell-dim hover:bg-shell-panel2"
          >
            Hủy
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg bg-shell-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>
      </div>
    </div>
  )
}
