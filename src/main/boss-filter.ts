import { randomUUID } from 'node:crypto'
import {
  AccountInstance,
  BossDirective,
  BossWatchRule,
  IncomingNotificationPayload,
  NewDirectivePayload,
  TodoItem
} from '../shared/types'

/**
 * Sprint-1 Boss & @Mention filter (Main Process side).
 *
 * Translation / intent extraction is applied asynchronously by AssistantService.enrich() when the user configures an AI key; without a key these rule-based values stand.
 * (docs/AI_WORK_ASSISTANT.md). For Sprint 1 this deterministic filter decides
 * whether a captured notification is a "directive" (boss message or a
 * @mention of the user) and builds the `assistant:new-directive` payload.
 */

const TASK_HINTS = [
  'deadline',
  'gấp',
  'khẩn',
  'urgent',
  'asap',
  'hoàn thành',
  'làm xong',
  'gửi lại',
  'báo cáo',
  'họp',
  'meeting',
  '제출',
  '까지',
  '마감',
  '긴급',
  '회의',
  '締切',
  'お願い'
]

const URGENT_HINTS = ['gấp', 'khẩn', 'urgent', 'asap', '긴급', 'hot', 'ngay']

function includesAny(haystack: string, needles: string[]): string | undefined {
  const lower = haystack.toLowerCase()
  return needles.find((n) => n && lower.includes(n.toLowerCase()))
}

export interface FilterResult {
  directive: BossDirective
  todo?: TodoItem
}

/** Returns null when the notification is not a boss/@mention directive. */
export function evaluateNotification(
  rule: BossWatchRule,
  account: AccountInstance,
  payload: IncomingNotificationPayload
): FilterResult | null {
  const text = `${payload.title}\n${payload.body}`
  const mentionKeyword =
    includesAny(text, rule.myMentionKeywords) ??
    (/@all/i.test(text) ? '@all' : undefined)
  const bossName = includesAny(payload.title, rule.bossSenderNames)

  if (!mentionKeyword && !bossName) return null

  const matchedBy: BossDirective['matchedBy'] =
    mentionKeyword && bossName
      ? 'mention+boss'
      : mentionKeyword
        ? 'mention'
        : 'boss'

  const directive: BossDirective = {
    id: randomUUID(),
    accountId: account.id,
    platform: account.serviceType,
    title: payload.title,
    body: payload.body,
    translatedBody: payload.body, // Pre-AI value; AssistantService.enrich() replaces it when AI is configured.
    timestamp: new Date(payload.timestamp || Date.now()).toISOString(),
    matchedBy,
    matchedKeyword: mentionKeyword ?? bossName
  }

  let todo: TodoItem | undefined
  if (rule.autoCreateTodo && includesAny(payload.body, TASK_HINTS)) {
    const firstLine =
      payload.body.split('\n').find((l) => l.trim().length > 0)?.trim() ??
      payload.body
    todo = {
      id: randomUUID(),
      title: firstLine.slice(0, 120),
      originalMessage: payload.body,
      translatedMessage: payload.body, // Pre-AI value; enrich() replaces it when AI is configured.
      sourceAccountId: account.id,
      sourcePlatform: account.serviceType,
      chatRoomName: payload.title,
      senderName: bossName ?? payload.title,
      priority: includesAny(payload.body, URGENT_HINTS) ? 'URGENT' : 'MEDIUM',
      completed: false,
      createdAt: new Date().toISOString()
    }
  }

  return { directive, todo }
}

export function toNewDirectivePayload(result: FilterResult): NewDirectivePayload {
  return { directive: result.directive, todo: result.todo }
}
