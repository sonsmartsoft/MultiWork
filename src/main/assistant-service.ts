import { randomUUID } from 'node:crypto'
import {
  AccountInstance,
  AssistantStatePayload,
  BossDirective,
  BossWatchRule,
  DEFAULT_BOSS_RULE,
  NewDirectivePayload,
  ScheduleEvent,
  TodoItem
} from '../shared/types'
import { aiService, extractScheduleAndDeadline } from './ai-service'
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
export interface AssistantHooks {
  /** Current translation target language from the boss watch rule. */
  targetLanguage: () => string
  /** The full boss watch rule (autoCreateEvent gates event extraction). */
  getRule: () => BossWatchRule
  /** Push the full assistant state to the renderer (after AI enrichment). */
  pushState: () => void
}

export class AssistantService {
  constructor(
    private readonly store: JsonStore,
    private readonly notifyRenderer: (payload: NewDirectivePayload) => void,
    private readonly hooks: AssistantHooks = {
      targetLanguage: () => 'vi',
      getRule: () => DEFAULT_BOSS_RULE,
      pushState: () => undefined
    }
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
      translatedBody: text, // Pre-AI value; enrich() replaces it when AI is configured.
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
        translatedMessage: text, // Pre-AI value; enrich() replaces it when AI is configured.
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
    void this.enrich(payload)
  }

  /**
   * Background enrichment pipeline (Sprint 3, MUSE-06):
   *   1. Translate — LLM engine when a key is configured, otherwise the
   *      free zero-config engine (MUSE-06.B); never hard-fails.
   *   2. Deterministic multilingual schedule extraction (MUSE-06.B):
   *      fills the To-Do deadline and auto-creates a ScheduleEvent for
   *      meeting messages when the boss rule allows it.
   *   3. LLM smart extraction (MUSE-06.A) refines title / priority /
   *      deadline when a Gemini key is configured.
   * Fully best-effort: on any failure the rule-based Sprint 1/2 values
   * simply stay as they are.
   */
  private async enrich(payload: NewDirectivePayload): Promise<void> {
    try {
      const { directives, todos, events } = this.store.data
      const directive = directives.find((d) => d.id === payload.directive.id)
      if (!directive) return
      const todo = payload.todo
        ? todos.find((t) => t.id === payload.todo?.id)
        : undefined
      const rule = this.hooks.getRule()
      const view = aiService.getView()
      let changed = false

      // 1) Translation (dual engine).
      let translated: string | undefined
      if (view.autoTranslate) {
        translated = await aiService
          .translate(directive.body, this.hooks.targetLanguage())
          .catch(() => undefined)
        if (translated && translated !== directive.body) {
          directive.translatedBody = translated
          if (todo) {
            todo.translatedMessage = translated
            // Spec MUSE-06: the To-Do title is written in the TRANSLATED
            // language; the LLM pass below may refine it further.
            const firstLine = translated
              .split('\n')
              .find((l) => l.trim().length > 0)
              ?.trim()
            if (firstLine) todo.title = firstLine.slice(0, 120)
          }
          changed = true
        }
      }

      // 2) Rule-based schedule / deadline extraction.
      const ex = extractScheduleAndDeadline(directive.body)
      if (todo && !todo.dueAt) {
        let due: Date | undefined = ex.startAt
        if (!due && ex.dateOnly) {
          due = new Date(ex.dateOnly)
          due.setHours(17, 0, 0, 0)
        }
        if (due) {
          todo.dueAt = due.toISOString()
          changed = true
        }
      }
      if (rule.autoCreateEvent && ex.isMeeting && ex.startAt) {
        const startMs = ex.startAt.getTime()
        const duplicate = events.some(
          (e) =>
            e.sourceAccountId === directive.accountId &&
            Math.abs(Date.parse(e.startTime) - startMs) < 60_000
        )
        if (!duplicate) {
          const title =
            (translated
              ? translated.split('\n').find((l) => l.trim().length > 0)?.trim()
              : undefined) ??
            todo?.title ??
            directive.body.split('\n')[0]?.trim() ??
            'Cuộc họp'
          events.unshift({
            id: randomUUID(),
            title: title.slice(0, 120),
            startTime: ex.startAt.toISOString(),
            endTime: new Date(startMs + 60 * 60_000).toISOString(),
            reminderMinutesBefore: 15,
            sourceTodoId: todo?.id,
            sourceAccountId: directive.accountId,
            syncedToExternalCalendar: false
          })
          if (events.length > MAX_EVENTS) events.length = MAX_EVENTS
          changed = true
        }
      }

      // 3) LLM smart extraction refines the To-Do.
      if (aiService.isReady() && view.smartExtract && todo) {
        const smart = await aiService
          .extractTask(directive.body)
          .catch(() => null)
        if (smart?.hasTask) {
          if (smart.title) {
            todo.title = smart.title.slice(0, 120)
            changed = true
          }
          if (smart.dueAt && !Number.isNaN(Date.parse(smart.dueAt))) {
            todo.dueAt = new Date(smart.dueAt).toISOString()
            changed = true
          }
          if (smart.priority) {
            todo.priority = smart.priority
            changed = true
          }
        }
      }

      if (changed) {
        this.store.save()
        this.hooks.pushState()
      }
    } catch {
      // Enrichment must never break directive capture.
    }
  }
}
