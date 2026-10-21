import { useState } from 'react'
import {
  SERVICE_CATALOG,
  SERVICE_TYPES,
  type ServiceType
} from '../../shared/types'
import { useAccountsStore } from '../store/useAccountsStore'

interface AddServiceModalProps {
  onClose: () => void
}

/**
 * Add-account modal. While it is open, App hides the active chat view via
 * `layout:set-chat-visible` so the native view can never cover the modal
 * (Acceptance Criteria #2).
 */
export default function AddServiceModal({ onClose }: AddServiceModalProps) {
  const add = useAccountsStore((s) => s.add)
  const [serviceType, setServiceType] = useState<ServiceType>('zalo')
  const [displayName, setDisplayName] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const entry = SERVICE_CATALOG[serviceType]
  const needsUrl = entry.kind === 'custom'

  const submit = async () => {
    setBusy(true)
    try {
      await add({
        serviceType,
        displayName: displayName.trim() || entry.label,
        customUrl: needsUrl && customUrl.trim() ? customUrl.trim() : undefined
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[520px] max-w-[92vw] rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-shell-text">
            Thêm tài khoản chat
          </h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-shell-dim hover:bg-shell-panel2 hover:text-shell-text"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {SERVICE_TYPES.map((type) => {
            const item = SERVICE_CATALOG[type]
            const selected = type === serviceType
            return (
              <button
                key={type}
                onClick={() => setServiceType(type)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors ${
                  selected
                    ? 'border-shell-accentDim bg-shell-panel2 text-shell-text'
                    : 'border-shell-border text-shell-dim hover:bg-shell-panel2'
                }`}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                  style={{ backgroundColor: item.color }}
                >
                  {item.glyph}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>

        <label className="mt-4 block text-[12px] font-medium text-shell-dim">
          Tên gợi nhớ (có thể thêm nhiều tài khoản cùng một dịch vụ)
        </label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={entry.label}
          className="mt-1 w-full rounded-lg border border-shell-border bg-shell-bg px-3 py-2 text-sm text-shell-text outline-none focus:border-shell-accentDim"
        />

        {needsUrl && (
          <>
            <label className="mt-3 block text-[12px] font-medium text-shell-dim">
              URL web chat
            </label>
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-shell-border bg-shell-bg px-3 py-2 text-sm text-shell-text outline-none focus:border-shell-accentDim"
            />
          </>
        )}

        {(entry.kind === 'extension' || entry.kind === 'native') && (
          <p className="mt-3 rounded-lg bg-shell-panel2 px-3 py-2 text-[12px] leading-relaxed text-shell-dim">
            {entry.label}: khung hiển thị và phân vùng phiên đã sẵn sàng —
            tích hợp đầy đủ (Extension Loader / Native Dock) sẽ nối ở Sprint 2.
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-shell-dim hover:bg-shell-panel2"
          >
            Hủy
          </button>
          <button
            onClick={() => void submit()}
            disabled={busy || (needsUrl && !customUrl.trim())}
            className="rounded-lg bg-shell-accent px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:opacity-40"
          >
            {busy ? 'Đang thêm...' : 'Thêm & mở'}
          </button>
        </div>
      </div>
    </div>
  )
}
