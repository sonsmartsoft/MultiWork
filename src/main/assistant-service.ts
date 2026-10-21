import { randomUUID } from 'node:crypto'
import {
  AccountInstance,
  AssistantStatePayload,
  BossDirective,
  NewDirectivePayload,
  ScheduleEvent,
  TodoItem
} from '../shared/types'
import type { FilterResult } from './boss-filter'
import { JsonStore } from './store'

const MAX_DIRECTIVES = 200
const MAX_TODOS = 500
const MAX_EVENTS = 500

/** How a context-menu selection should be ingested (Sprint 2, MUSE-04). */
export type SelectionActionKind = 'todo' | 'directive'

/**
 * AssistantService — the single funnel for Boss directives, To-Dos and
 * Schedule events in the Main Process.
 *
 * REV-01 [HIGH-04]: every item created here (from a chat notification or
 * from the Sprint-2 context menu) is persisted to the JsonStore
 * immediately, and renderer-side mutations are written back through
 * `saveTodos` / `saveEvents`, so nothing is lost across restarts.
 */
export class AssistantService {
  constructor(
    private readonly store: JsonStore,
    private readonly notifyRenderer: (payload: NewDirectivePayload) => void
  ) {}

  getState(): AssistantStatePayload {
    return {
      directives: this.store.data.directives,
      todos: this.store.data.todos,
      events: this.store.data.events
    }
  }

  saveTodos(todos: TodoItem[]): void {
    this.store.data.todos = todos.slice(0, MAX_TODOS)
    this.store.save()
  }

  saveEvents(events: ScheduleEvent[]): void {
    this.store.data.events = events.slice(0, MAX_EVENTS)
    this.store.save()
  }

  /** Persist + broadcast a boss-filter result from a chat notification. */
  ingestFilterResult(result: FilterResult): void {
    this.ingest({ directive: result.directive, todo: result.todo })
  }

  /**
   * Sprint 2 (MUSE-04): turn a text selection inside any chat view into a
   * directive, and optionally a To-Do, via the Electron context menu.
   * `params.selectionText` is captured at Chromium level, so this works on
   * every platform regardless of the web app's DOM structure.
   */
  ingestSelection(
    account: AccountInstance,
    rawText: string,
    kind: SelectionActionKind
  ): void {
    const text = rawText.trim()
    if (!text) return
    const now = new Date().toISOString()
    const directive: BossDirective = {
      id: randomUUID(),
      accountId: account.id,
      platform: account.serviceType,
      title: account.displayName,
      body: text,
      translatedBody: text, // Sprint 3: replaced by the AI translation.
      timestamp: now,
      matchedBy: 'boss',
      matchedKeyword:
        kind === 'todo' ? '🤖 Context Menu' : '📌 Context Menu'
    }
    let todo: TodoItem | undefined
    if (kind === 'todo') {
      const firstLine =
        text.split('\n').find((l) => l.trim().length > 0)?.trim() ?? text
      todo = {
        id: randomUUID(),
        title: firstLine.slice(0, 120),
        originalMessage: text,
        translatedMessage: text, // Sprint 3: AI translation.
        sourceAccountId: account.id,
        sourcePlatform: account.serviceType,
        chatRoomName: account.displayName,
        senderName: account.displayName,
        priority: 'MEDIUM',
        completed: false,
        createdAt: now
      }
    }
    this.ingest({ directive, todo })
  }

  private ingest(payload: NewDirectivePayload): void {
    const { directives, todos, events } = this.store.data
    directives.unshift(payload.directive)
    if (directives.length > MAX_DIRECTIVES) {
      directives.length = MAX_DIRECTIVES
    }
    if (payload.todo) {
      todos.unshift(payload.todo)
      if (todos.length > MAX_TODOS) todos.length = MAX_TODOS
    }
    if (payload.event) {
      events.unshift(payload.event)
      if (events.length > MAX_EVENTS) events.length = MAX_EVENTS
    }
    this.store.save()
    this.notifyRenderer(payload)
  }
}
