import { useState } from 'react'
import { SERVICE_CATALOG, type TodoItem } from '../../shared/types'
import { useAccountsStore } from '../store/useAccountsStore'
import { useAssistantStore } from '../store/useAssistantStore'

const PRIORITY_STYLE: Record<TodoItem['priority'], string> = {
  URGENT: 'bg-red-500/15 text-red-400',
  HIGH: 'bg-orange-500/15 text-orange-400',
  MEDIUM: 'bg-shell-accent/15 text-shell-accent',
  LOW: 'bg-shell-border/40 text-shell-dim'
}

/** Tab 2: to-do items extracted from boss directives (+ manual entries). */
export default function TodoBoard() {
  const todos = useAssistantStore((s) => s.todos)
  const toggleTodo = useAssistantStore((s) => s.toggleTodo)
  const removeTodo = useAssistantStore((s) => s.removeTodo)
  const addManualTodo = useAssistantStore((s) => s.addManualTodo)
  const switchTo = useAccountsStore((s) => s.switchTo)
  const [draft, setDraft] = useState('')

  const open = todos.filter((t) => !t.completed)
  const done = todos.filter((t) => t.completed)

  const renderItem = (todo: TodoItem) => {
    const entry = SERVICE_CATALOG[todo.sourcePlatform]
    return (
      <li
        key={todo.id}
        className="group flex items-start gap-2 rounded-xl border border-shell-border bg-shell-panel2 p-3"
      >
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => toggleTodo(todo.id)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-amber-400"
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-[13px] leading-snug ${
              todo.completed
                ? 'text-shell-dim line-through'
                : 'text-shell-text'
            }`}
          >
            {todo.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-shell-dim">
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_STYLE[todo.priority]}`}
            >
              {todo.priority}
            </span>
            <span
              className="flex items-center gap-1 rounded-full bg-shell-bg px-2 py-0.5"
              title={entry.label}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {todo.chatRoomName}
            </span>
            {todo.dueAt && (
              <span>
                Hạn: {new Date(todo.dueAt).toLocaleString('vi-VN')}
              </span>
            )}
          </div>
        </div>
        {todo.sourceAccountId && (
          <button
            onClick={() => void switchTo(todo.sourceAccountId)}
            title="Nhảy về app chat gốc"
            className="shrink-0 text-[12px] text-shell-dim hover:text-shell-accent"
          >
            ↗
          </button>
        )}
        <button
          onClick={() => removeTodo(todo.id)}
          title="Xóa"
          className="hidden shrink-0 text-[12px] text-shell-dim hover:text-red-400 group-hover:block"
        >
          ✕
        </button>
      </li>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 p-3 pb-0">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              addManualTodo(draft)
              setDraft('')
            }
          }}
          placeholder="Thêm việc thủ công rồi Enter..."
          className="min-w-0 flex-1 rounded-lg border border-shell-border bg-shell-bg px-3 py-2 text-[13px] text-shell-text outline-none focus:border-shell-accentDim"
        />
        <button
          onClick={() => {
            addManualTodo(draft)
            setDraft('')
          }}
          className="shrink-0 rounded-lg bg-shell-accent px-3 py-2 text-[13px] font-semibold text-black"
        >
          Thêm
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {todos.length === 0 ? (
          <p className="text-[13px] leading-relaxed text-shell-dim">
            Chưa có việc nào. Các chỉ thị giao việc của Sếp sẽ tự động được bóc
            tách vào đây.
          </p>
        ) : (
          <>
            <ul className="space-y-2">{open.map(renderItem)}</ul>
            {done.length > 0 && (
              <>
                <h4 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-shell-dim">
                  Đã xong ({done.length})
                </h4>
                <ul className="space-y-2">{done.map(renderItem)}</ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
