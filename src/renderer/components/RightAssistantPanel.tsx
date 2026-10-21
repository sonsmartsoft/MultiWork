import { useState } from 'react'
import { LAYOUT } from '../../shared/types'
import { useAssistantStore } from '../store/useAssistantStore'
import BossDirectiveFeed from './BossDirectiveFeed'
import ScheduleCalendar from './ScheduleCalendar'
import TodoBoard from './TodoBoard'

type TabId = 'directives' | 'todos' | 'schedule'

const TABS: { id: TabId; label: string }[] = [
  { id: 'directives', label: '🔔 Chỉ thị Sếp' },
  { id: 'todos', label: '✅ Việc cần làm' },
  { id: 'schedule', label: '📅 Lịch trình' }
]

/**
 * Right column (360px): the AI Work Co-Pilot panel with 3 tabs —
 * Boss directives, To-Do board and Schedule (docs/PLAN.md §4.1).
 */
export default function RightAssistantPanel() {
  const [tab, setTab] = useState<TabId>('directives')
  const directiveCount = useAssistantStore((s) => s.directives.length)
  const openTodoCount = useAssistantStore(
    (s) => s.todos.filter((t) => !t.completed).length
  )
  const setPanelOpen = useAssistantStore((s) => s.setPanelOpen)

  const badge = (id: TabId): number =>
    id === 'directives' ? directiveCount : id === 'todos' ? openTodoCount : 0

  return (
    <section
      className="flex h-full shrink-0 flex-col border-l border-shell-border bg-shell-panel"
      style={{ width: LAYOUT.ASSISTANT_PANEL_WIDTH }}
    >
      <header className="flex items-center gap-1 border-b border-shell-border px-2 py-2">
        <div className="flex flex-1 gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                tab === t.id
                  ? 'bg-shell-panel2 text-shell-text'
                  : 'text-shell-dim hover:text-shell-text'
              }`}
            >
              {t.label}
              {badge(t.id) > 0 && (
                <span className="ml-1 rounded-full bg-shell-accent px-1.5 py-0.5 text-[10px] font-bold text-black">
                  {badge(t.id)}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setPanelOpen(false)}
          title="Thu gọn bảng trợ lý"
          className="rounded-md px-2 py-1 text-shell-dim hover:bg-shell-panel2 hover:text-shell-text"
        >
          ▶
        </button>
      </header>

      <div className="min-h-0 flex-1">
        {tab === 'directives' && <BossDirectiveFeed />}
        {tab === 'todos' && <TodoBoard />}
        {tab === 'schedule' && <ScheduleCalendar />}
      </div>
    </section>
  )
}
