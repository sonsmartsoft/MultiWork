import { create } from 'zustand'
import type {
  BossDirective,
  BossWatchRule,
  NewDirectivePayload,
  ScheduleEvent,
  TodoItem
} from '../../shared/types'

interface AssistantState {
  panelOpen: boolean
  directives: BossDirective[]
  todos: TodoItem[]
  events: ScheduleEvent[]
  bossRule: BossWatchRule | null
  initialized: boolean
  setPanelOpen: (open: boolean) => void
  init: () => Promise<void>
  receiveDirective: (payload: NewDirectivePayload) => void
  addManualTodo: (title: string) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
  saveBossRule: (rule: BossWatchRule) => Promise<void>
}

let unsubscribeDirective: (() => void) | null = null

export const useAssistantStore = create<AssistantState>()((set, get) => ({
  panelOpen: true,
  directives: [],
  todos: [],
  events: [],
  bossRule: null,
  initialized: false,

  setPanelOpen: (open) => set({ panelOpen: open }),

  init: async () => {
    if (get().initialized) return
    set({ initialized: true })
    const rule = await window.multiworkAPI.getBossRule()
    set({ bossRule: rule })
    unsubscribeDirective?.()
    unsubscribeDirective = window.multiworkAPI.onNewDirective((payload) => {
      get().receiveDirective(payload)
    })
  },

  receiveDirective: (payload) => {
    set((s) => ({
      directives: [payload.directive, ...s.directives].slice(0, 200),
      todos: payload.todo ? [payload.todo, ...s.todos] : s.todos,
      events: payload.event ? [payload.event, ...s.events] : s.events
    }))
  },

  addManualTodo: (title) => {
    const trimmed = title.trim()
    if (!trimmed) return
    const todo: TodoItem = {
      id: `manual-${Date.now()}`,
      title: trimmed,
      originalMessage: '',
      translatedMessage: trimmed,
      sourceAccountId: '',
      sourcePlatform: 'custom-web',
      chatRoomName: 'Thêm thủ công',
      senderName: 'Tôi',
      priority: 'MEDIUM',
      completed: false,
      createdAt: new Date().toISOString()
    }
    set((s) => ({ todos: [todo, ...s.todos] }))
  },

  toggleTodo: (id) => {
    set((s) => ({
      todos: s.todos.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    }))
  },

  removeTodo: (id) => {
    set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }))
  },

  saveBossRule: async (rule) => {
    await window.multiworkAPI.setBossRule(rule)
    set({ bossRule: rule })
  }
}))
