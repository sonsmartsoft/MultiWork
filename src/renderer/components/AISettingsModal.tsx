import { useEffect, useState } from 'react'
import type { AISettingsUpdate, AITestResult } from '../../shared/types'
import { useAssistantStore } from '../store/useAssistantStore'

interface AISettingsModalProps {
  onClose: () => void
}

/**
 * AI engine settings: provider + the user's own Gemini API key.
 * The key is sent to the Main process once (over IPC) and stored there
 * encrypted with the OS vault — the renderer never reads it back; it only
 * sees the `hasKey` flag from AISettingsView.
 */
export default function AISettingsModal({ onClose }: AISettingsModalProps) {
  const aiSettings = useAssistantStore((s) => s.aiSettings)
  const saveAISettings = useAssistantStore((s) => s.saveAISettings)
  const bossRule = useAssistantStore((s) => s.bossRule)

  const [provider, setProvider] = useState<'gemini' | 'off'>('gemini')
  const [model, setModel] = useState('gemini-3.8-flash')
  const [keyInput, setKeyInput] = useState('')
  const [autoTranslate, setAutoTranslate] = useState(true)
  const [smartExtract, setSmartExtract] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<AITestResult | null>(null)

  useEffect(() => {
    if (!aiSettings) return
    setProvider(aiSettings.provider)
    setModel(aiSettings.model)
    setAutoTranslate(aiSettings.autoTranslate)
    setSmartExtract(aiSettings.smartExtract)
  }, [aiSettings])

  const formUpdate = (withKey: boolean): AISettingsUpdate => ({
    provider,
    model,
    autoTranslate,
    smartExtract,
    ...(withKey && keyInput ? { apiKey: keyInput } : {})
  })

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // Persist the form first so the test uses exactly what will be saved.
      await saveAISettings(formUpdate(true))
      setKeyInput('')
      const result = await window.multiworkAPI.testAIConnection()
      setTestResult(result)
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Lỗi không xác định'
      })
    } finally {
      setTesting(false)
    }
  }

  const clearKey = async () => {
    setSaving(true)
    try {
      await saveAISettings({ apiKey: '' })
      setTestResult(null)
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveAISettings(formUpdate(true))
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const hasKey = aiSettings?.hasKey ?? false
  const langName =
    bossRule?.targetLanguage === 'en'
      ? 'English'
      : bossRule?.targetLanguage === 'ko'
        ? '한국어'
        : bossRule?.targetLanguage === 'ja'
          ? '日本語'
          : 'Tiếng Việt'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="max-h-[92vh] w-[520px] max-w-[92vw] overflow-y-auto rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-shell-text">
            🤖 Cài đặt AI — dịch &amp; trích xuất thông minh
          </h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-shell-dim hover:bg-shell-panel2 hover:text-shell-text"
          >
            ✕
          </button>
        </div>

        <label className="block text-[12px] font-medium text-shell-dim">
          Nhà cung cấp AI
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as 'gemini' | 'off')}
          className="mt-1 w-full rounded-lg border border-shell-border bg-shell-bg px-3 py-2 text-sm text-shell-text outline-none focus:border-shell-accentDim"
        >
          <option value="gemini">Google Gemini (dùng API key của bạn)</option>
          <option value="off">Tắt AI — chỉ dùng chế độ quy tắc</option>
        </select>

        {provider === 'gemini' && (
          <>
            <label className="mt-4 block text-[12px] font-medium text-shell-dim">
              Gemini API key {hasKey && <span className="text-emerald-400">(đã lưu trên máy này)</span>}
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder={
                hasKey
                  ? '•••••••••• — để trống nếu giữ nguyên, nhập mới để thay'
                  : 'Dán Gemini API key của bạn (ví dụ key đang dùng cho SSSOL)'
              }
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-shell-border bg-shell-bg px-3 py-2 text-sm text-shell-text outline-none focus:border-shell-accentDim"
            />
            <p className="mt-1 text-[11px] leading-relaxed text-shell-dim">
              Key được mã hóa bằng két hệ điều hành (safeStorage) và chỉ lưu
              trên máy này — không gửi đi đâu ngoài Google Gemini, không lên
              GitHub.
            </p>

            <label className="mt-4 block text-[12px] font-medium text-shell-dim">
              Model
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-shell-border bg-shell-bg px-3 py-2 text-sm text-shell-text outline-none focus:border-shell-accentDim"
            />
          </>
        )}

        <div className="mt-4 space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-shell-text">
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(e) => setAutoTranslate(e.target.checked)}
              className="h-4 w-4 accent-amber-400"
            />
            Tự động dịch chỉ thị của Sếp sang {langName}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-shell-text">
            <input
              type="checkbox"
              checked={smartExtract}
              onChange={(e) => setSmartExtract(e.target.checked)}
              className="h-4 w-4 accent-amber-400"
            />
            Trích xuất thông minh: tiêu đề việc, deadline &amp; độ ưu tiên từ
            nội dung chỉ thị
          </label>
        </div>

        {testResult && (
          <p
            className={`mt-4 rounded-lg px-3 py-2 text-[12.5px] ${
              testResult.ok
                ? 'bg-emerald-500/10 text-emerald-300'
                : 'bg-red-500/10 text-red-300'
            }`}
          >
            {testResult.ok ? '✅ ' : '⚠️ '}
            {testResult.message}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => void test()}
              disabled={testing || provider === 'off'}
              className="rounded-lg border border-shell-border px-3 py-2 text-sm text-shell-text hover:bg-shell-panel2 disabled:opacity-40"
            >
              {testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
            </button>
            {hasKey && (
              <button
                onClick={() => void clearKey()}
                disabled={saving}
                className="rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-40"
              >
                Xóa key
              </button>
            )}
          </div>
          <div className="flex gap-2">
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
    </div>
  )
}
