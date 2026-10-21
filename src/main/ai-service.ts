import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type {
  AIExtraction,
  AISettingsUpdate,
  AISettingsView,
  AITestResult
} from '../shared/types'

interface StoredAISettings {
  provider: 'gemini' | 'off'
  model: string
  autoTranslate: boolean
  smartExtract: boolean
  /** safeStorage-encrypted API key, base64. Never leaves this machine. */
  encryptedKeyB64?: string
}

const DEFAULT_SETTINGS: StoredAISettings = {
  provider: 'gemini',
  model: 'gemini-3.8-flash',
  autoTranslate: true,
  smartExtract: true
}

const LANGUAGE_NAMES: Record<string, string> = {
  vi: 'Vietnamese',
  en: 'English',
  ko: 'Korean',
  ja: 'Japanese',
  zh: 'Chinese'
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] }
  }[]
  error?: { message?: string }
}

/**
 * AIService — the real AI engine of the Work Co-Pilot.
 *
 * Holds the user's own Gemini API key in the Main process only, encrypted
 * at rest with Electron safeStorage (OS keychain / DPAPI). The renderer
 * only ever sees `AISettingsView` (a `hasKey` flag, never the key).
 * Powers directive translation and smart task extraction; when no key is
 * configured the app silently falls back to the rule-based Sprint 1/2
 * behaviour.
 */
class AIService {
  private settings: StoredAISettings | null = null
  /** Key kept for this session only when OS encryption is unavailable. */
  private sessionKey: string | undefined

  private filePath(): string {
    return path.join(app.getPath('userData'), 'ai-settings.json')
  }

  private load(): StoredAISettings {
    if (this.settings) return this.settings
    try {
      const raw = fs.readFileSync(this.filePath(), 'utf8')
      this.settings = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<StoredAISettings>) }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS }
    }
    return this.settings
  }

  private persist(): void {
    try {
      fs.writeFileSync(this.filePath(), JSON.stringify(this.load(), null, 2), 'utf8')
    } catch {
      // Settings persistence is best-effort; in-memory state still applies.
    }
  }

  private getKey(): string | undefined {
    const s = this.load()
    if (s.encryptedKeyB64) {
      try {
        if (safeStorage.isEncryptionAvailable()) {
          return safeStorage.decryptString(Buffer.from(s.encryptedKeyB64, 'base64'))
        }
      } catch {
        return undefined
      }
    }
    return this.sessionKey
  }

  getView(): AISettingsView {
    const s = this.load()
    return {
      provider: s.provider,
      model: s.model,
      autoTranslate: s.autoTranslate,
      smartExtract: s.smartExtract,
      hasKey: this.getKey() !== undefined
    }
  }

  update(update: AISettingsUpdate): AISettingsView {
    const s = this.load()
    if (update.provider !== undefined) s.provider = update.provider
    if (update.model !== undefined && update.model.trim()) {
      s.model = update.model.trim()
    }
    if (update.autoTranslate !== undefined) s.autoTranslate = update.autoTranslate
    if (update.smartExtract !== undefined) s.smartExtract = update.smartExtract
    if (update.apiKey !== undefined) {
      if (update.apiKey === '') {
        s.encryptedKeyB64 = undefined
        this.sessionKey = undefined
      } else if (safeStorage.isEncryptionAvailable()) {
        s.encryptedKeyB64 = safeStorage
          .encryptString(update.apiKey)
          .toString('base64')
        this.sessionKey = undefined
      } else {
        // No OS vault on this machine: keep the key for this session only
        // rather than writing it to disk in plain text.
        s.encryptedKeyB64 = undefined
        this.sessionKey = update.apiKey
      }
    }
    this.persist()
    return this.getView()
  }

  isReady(): boolean {
    const s = this.load()
    return s.provider === 'gemini' && this.getKey() !== undefined
  }

  private async generate(prompt: string, jsonMode = false): Promise<string> {
    const key = this.getKey()
    if (!key) throw new Error('Chưa cấu hình API key')
    const s = this.load()
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.model)}:generateContent`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(jsonMode
          ? { generationConfig: { responseMimeType: 'application/json' } }
          : {})
      })
    })
    const data = (await res.json().catch(() => ({}))) as GeminiResponse
    if (!res.ok) {
      throw new Error(data.error?.message ?? `Gemini HTTP ${res.status}`)
    }
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('')
      .trim()
    if (!text) throw new Error('Gemini trả về nội dung rỗng')
    return text
  }

  async testConnection(): Promise<AITestResult> {
    if (!this.getKey()) {
      return { ok: false, message: 'Chưa có API key — hãy dán key rồi thử lại.' }
    }
    try {
      const out = await this.generate('Reply with exactly one word: OK')
      return {
        ok: true,
        message: `Kết nối OK với model ${this.load().model} (phản hồi: "${out.slice(0, 30)}")`
      }
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Không kết nối được Gemini'
      }
    }
  }

  /**
   * Translate a chat message into the boss rule's target language
   * (MUSE-06 dual engine): the LLM engine when a Gemini key is configured,
   * otherwise — or on any LLM failure — the zero-config free Google
   * Translate engine, so translation NEVER hard-fails (MUSE-06.B).
   */
  async translate(text: string, targetLanguage: string): Promise<string> {
    if (this.isReady()) {
      try {
        return await this.translateWithLLM(text, targetLanguage)
      } catch {
        // Fall through to the free engine below.
      }
    }
    return this.translateFree(text, targetLanguage)
  }

  private async translateWithLLM(
    text: string,
    targetLanguage: string
  ): Promise<string> {
    const lang =
      LANGUAGE_NAMES[targetLanguage] ?? targetLanguage ?? 'Vietnamese'
    return this.generate(
      [
        'You are a translation engine for workplace chat messages.',
        `Translate the message below into ${lang}.`,
        'Output ONLY the translation — no explanations, no quotes, keep names, times and numbers unchanged.',
        '',
        text
      ].join('\n')
    )
  }

  /**
   * Zero-config free translation via the public Google Translate endpoint
   * (MUSE-06.B). No key, no billing — used whenever the LLM engine is not
   * configured, and as its fallback when a call fails.
   */
  async translateFree(text: string, targetLanguage: string): Promise<string> {
    const tl = encodeURIComponent(targetLanguage || 'vi')
    const q = encodeURIComponent(text.slice(0, 1800))
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${q}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (MultiWork)' }
    })
    if (!res.ok) throw new Error(`Free translate HTTP ${res.status}`)
    const data = (await res.json()) as unknown
    const segments = (data as [unknown[]] | null)?.[0] as
      | [string][]
      | undefined
    if (!Array.isArray(segments)) throw new Error('Free translate: bad reply')
    const out = segments
      .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? '') : ''))
      .join('')
      .trim()
    if (!out) throw new Error('Free translate: empty reply')
    return out
  }

  /**
   * Extract actionable task info (title / deadline / priority) from a
   * directive message. Returns null when the model output is unusable;
   * relative deadlines are resolved against the user's local clock.
   */
  async extractTask(text: string): Promise<AIExtraction | null> {
    const now = new Date()
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const raw = await this.generate(
      [
        'You extract actionable work tasks from chat messages (any language).',
        `Current local time: ${now.toString()} (timezone ${tz}).`,
        'Return STRICT JSON only, no markdown:',
        '{"hasTask": boolean, "title": string|null, "dueAt": string|null, "priority": "URGENT"|"HIGH"|"MEDIUM"|"LOW"|null}',
        '- hasTask: true only when the message assigns/requests concrete work.',
        '- title: short imperative task title in the message language (max 15 words), else null.',
        '- dueAt: absolute deadline as ISO 8601 with timezone offset, resolving relative expressions ("tomorrow 3pm", "chiều mai", "금요일까지") against the current time; null when no deadline is stated or implied.',
        '- priority: URGENT when the message stresses urgency, else a sensible level; null if unsure.',
        '',
        'Message:',
        text
      ].join('\n'),
      true
    )
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim()
      const start = cleaned.indexOf('{')
      const end = cleaned.lastIndexOf('}')
      if (start < 0 || end <= start) return null
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as AIExtraction
      if (typeof parsed.hasTask !== 'boolean') return null
      return parsed
    } catch {
      return null
    }
  }
}

// ---------------------------------------------------------------------------
// MUSE-06.B — deterministic multilingual schedule / deadline extraction.
// Pure regex engine over Vietnamese / Korean / Japanese / English time
// expressions (docs/SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md §MUSE-06). It runs
// with or without an LLM key; the LLM extraction (MUSE-06.A) refines its
// results afterwards when configured.
// ---------------------------------------------------------------------------

export interface ScheduleExtraction {
  /** Any time-of-day expression was found. */
  hasTime: boolean
  /** Meeting / appointment keywords were found. */
  isMeeting: boolean
  /** Resolved local date+time when a time-of-day was found. */
  startAt?: Date
  /** Resolved calendar date when only a date was found (no time). */
  dateOnly?: Date
}

const MEETING_WORDS = [
  'họp',
  'meeting',
  'call',
  '회의',
  '미팅',
  '화상회의',
  '打ち合わせ',
  '会議',
  'lịch',
  'schedule',
  'event',
  'hẹn',
  'appointment'
]

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

export function extractScheduleAndDeadline(
  text: string,
  now = new Date()
): ScheduleExtraction {
  const lower = text.toLowerCase()
  const isMeeting = MEETING_WORDS.some((w) => lower.includes(w))

  // --- Calendar date -------------------------------------------------------
  let date: Date | null = null
  const ymd = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text)
  const kor = /(\d{1,2})월\s*(\d{1,2})일/.exec(text)
  const jpn = /(\d{1,2})月\s*(\d{1,2})日/.exec(text)
  const dmy = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(text)
  if (ymd) {
    date = new Date(+ymd[1], +ymd[2] - 1, +ymd[3])
  } else if (kor) {
    date = new Date(now.getFullYear(), +kor[1] - 1, +kor[2])
  } else if (jpn) {
    date = new Date(now.getFullYear(), +jpn[1] - 1, +jpn[2])
  } else if (dmy) {
    const year = dmy[3]
      ? dmy[3].length === 2
        ? 2000 + +dmy[3]
        : +dmy[3]
      : now.getFullYear()
    date = new Date(year, +dmy[2] - 1, +dmy[1])
  }

  // Relative day offsets apply only when no explicit date was given.
  let offset: number | null = null
  if (!date) {
    if (/(ngày kia|모레|明後日|day after tomorrow)/.test(lower)) offset = 2
    else if (
      /(ngày mai|sáng mai|chiều mai|tối mai|내일|明日|tomorrow)/.test(lower) ||
      /(^|\s)mai(\s|$)/.test(lower) // bare "mai" (e.g. "mai 10h họp")
    )
      offset = 1
    else if (/(hôm nay|오늘|今日|today)/.test(lower)) offset = 0
  }

  // --- Time of day ---------------------------------------------------------
  let hour: number | null = null
  let minute = 0
  const ampm = /(\d{1,2})\s*(am|pm)/i.exec(text)
  const hhmm = /(\d{1,2}):(\d{2})/.exec(text)
  const hmm = /(\d{1,2})h(\d{2})/.exec(text)
  const unit =
    /(\d{1,2})\s*(?:giờ|時|시)(?:\s*(\d{1,2})\s*(?:phút|분|分))?/.exec(text) ??
    /(\d{1,2})\s*h(?![\d:])/.exec(text)
  if (ampm) {
    hour = +ampm[1] % 12
    if (/pm/i.test(ampm[2])) hour += 12
  } else if (hhmm) {
    hour = +hhmm[1]
    minute = +hhmm[2]
  } else if (hmm) {
    hour = +hmm[1]
    minute = +hmm[2]
  } else if (unit) {
    hour = +unit[1]
    minute = unit[2] ? +unit[2] : 0
  }
  // Session markers (sáng/chiều/tối · 오전/오후 · 午前/午後) shift bare hours.
  if (hour !== null && !ampm) {
    if (/(chiều|tối|오후|午後)/.test(lower) && hour < 12) hour += 12
    else if (/(sáng|오전|午前)/.test(lower) && hour === 12) hour = 0
  }

  // --- Combine -------------------------------------------------------------
  let startAt: Date | undefined
  if (hour !== null) {
    const base = date ? new Date(date) : startOfDay(now)
    if (!date && offset) base.setDate(base.getDate() + offset)
    base.setHours(hour, minute, 0, 0)
    // "3pm meeting" said at 4pm with no day anchor almost surely means
    // tomorrow — roll forward when the implied time is already past.
    if (!date && offset === null && base.getTime() < now.getTime() - 30 * 60_000) {
      base.setDate(base.getDate() + 1)
    }
    startAt = base
  }

  let dateOnly: Date | undefined
  if (!startAt) {
    if (date) dateOnly = startOfDay(date)
    else if (offset !== null) {
      dateOnly = startOfDay(now)
      dateOnly.setDate(dateOnly.getDate() + offset)
    }
  }

  return { hasTime: hour !== null, isMeeting, startAt, dateOnly }
}

export const aiService = new AIService()
