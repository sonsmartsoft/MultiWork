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

  /** Translate a chat message into the boss rule's target language. */
  async translate(text: string, targetLanguage: string): Promise<string> {
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

export const aiService = new AIService()
