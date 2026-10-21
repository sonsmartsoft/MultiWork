import { execFile, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import type { DockResult, KakaoStatus } from '../../shared/types'

/**
 * KakaoDocker — Sprint 2 (MUSE-05): KakaoTalk native window coordinator.
 *
 * KakaoTalk personal accounts have no web/extension client at all, so
 * MultiWork coordinates the official KakaoTalk DESKTOP app's window:
 * detect the installation, launch it, and dock its window exactly over
 * MultiWork's chat viewport.
 *
 * Per the Architect's direction this deliberately uses NO C++ native
 * addons (node-gyp breaks cross-platform builds): window coordination is
 * done with PowerShell + inline C# P/Invoke (`Add-Type`) on Windows and
 * `osascript` (System Events) on macOS.
 */

export interface ScreenBounds {
  x: number
  y: number
  width: number
  height: number
}

const KAKAO_WINDOW_TITLE = 'KakaoTalk'

function windowsCandidates(): string[] {
  const bases = [
    process.env['ProgramFiles(x86)'],
    process.env['ProgramFiles'],
    process.env['LOCALAPPDATA']
  ].filter((b): b is string => typeof b === 'string' && b.length > 0)
  return bases.map((b) => path.join(b, 'Kakao', 'KakaoTalk', 'KakaoTalk.exe'))
}

const MAC_APP_PATH = '/Applications/KakaoTalk.app'

/** Exe path found by the deep (registry) probe, reused by sync checks. */
let cachedExePath: string | undefined

export function detectKakaoTalk(): KakaoStatus {
  if (process.platform === 'win32') {
    if (cachedExePath && fs.existsSync(cachedExePath)) {
      return {
        installed: true,
        installPath: cachedExePath,
        platform: process.platform
      }
    }
    const found = windowsCandidates().find((p) => fs.existsSync(p))
    return {
      installed: found !== undefined,
      installPath: found,
      platform: process.platform
    }
  }
  if (process.platform === 'darwin') {
    const installed = fs.existsSync(MAC_APP_PATH)
    return {
      installed,
      installPath: installed ? MAC_APP_PATH : undefined,
      platform: process.platform
    }
  }
  return { installed: false, platform: process.platform }
}

const REGISTRY_PROBE = `
$roots = @(
  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
)
$app = Get-ItemProperty $roots -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -like '*KakaoTalk*' } |
  Select-Object -First 1
if ($app) {
  Write-Output $app.InstallLocation
  Write-Output $app.DisplayIcon
}
`

/**
 * Deep detection: the fixed install paths can miss custom install
 * locations, so on Windows also probe the Uninstall registry keys for
 * KakaoTalk's InstallLocation / DisplayIcon and verify the exe exists.
 */
export async function detectKakaoTalkDeep(): Promise<KakaoStatus> {
  const quick = detectKakaoTalk()
  if (quick.installed || process.platform !== 'win32') return quick
  try {
    const out = await runPowershellCapture(REGISTRY_PROBE)
    const lines = out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    const candidates: string[] = []
    for (const line of lines) {
      const cleaned = line.replace(/^"|"$/g, '').replace(/,\d+$/, '')
      if (/\.exe$/i.test(cleaned)) candidates.push(cleaned)
      candidates.push(path.join(cleaned, 'KakaoTalk.exe'))
      candidates.push(path.join(cleaned, 'Kakao', 'KakaoTalk', 'KakaoTalk.exe'))
    }
    const found = candidates.find((p) => fs.existsSync(p))
    if (found) {
      cachedExePath = found
      return { installed: true, installPath: found, platform: process.platform }
    }
  } catch {
    // Registry probe is best-effort; the fixed-path result stands.
  }
  return quick
}

/** Launch the KakaoTalk desktop app (or focus it if already running). */
export async function launchKakaoTalk(): Promise<DockResult> {
  const status = await detectKakaoTalkDeep()
  if (!status.installed || !status.installPath) {
    return {
      ok: false,
      reason: 'Chưa phát hiện KakaoTalk Desktop trên máy này.'
    }
  }
  try {
    if (process.platform === 'darwin') {
      await run('open', ['-a', 'KakaoTalk'])
    } else {
      const child = spawn(status.installPath, [], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: errorMessage(err) }
  }
}

const WIN32_PREAMBLE = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class MWWin32 {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
$h = [MWWin32]::FindWindow($null, "${KAKAO_WINDOW_TITLE}")
if ($h -eq [IntPtr]::Zero) { exit 3 }
`

function fillBounds(script: string, b: ScreenBounds): string {
  return script
    .replaceAll('__X__', String(Math.round(b.x)))
    .replaceAll('__Y__', String(Math.round(b.y)))
    .replaceAll('__W__', String(Math.round(b.width)))
    .replaceAll('__H__', String(Math.round(b.height)))
}

/** Move/resize the KakaoTalk window exactly over the given screen rect. */
export async function dockKakaoTalk(bounds: ScreenBounds): Promise<DockResult> {
  try {
    if (process.platform === 'win32') {
      const script = fillBounds(
        WIN32_PREAMBLE +
          `
[MWWin32]::ShowWindow($h, 9) | Out-Null
$ok = [MWWin32]::SetWindowPos($h, [IntPtr]::Zero, __X__, __Y__, __W__, __H__, 0x0040)
if (-not $ok) { exit 4 }
exit 0
`,
        bounds
      )
      await runPowershell(script)
      return { ok: true }
    }
    if (process.platform === 'darwin') {
      const script = fillBounds(
        `
tell application "System Events"
  if not (exists process "KakaoTalk") then error "KakaoTalk chưa chạy"
  tell process "KakaoTalk"
    set position of window 1 to {__X__, __Y__}
    set size of window 1 to {__W__, __H__}
  end tell
end tell
`,
        bounds
      )
      await run('osascript', ['-e', script])
      return { ok: true }
    }
    return { ok: false, reason: `Nền tảng ${process.platform} chưa hỗ trợ.` }
  } catch (err) {
    return { ok: false, reason: dockErrorReason(err) }
  }
}

/**
 * Minimize/hide the KakaoTalk window (Sprint 3, MUSE-08 auto-hide): used
 * when the user switches away from the KakaoTalk account or a shell modal
 * covers the viewport, so the docked window never floats over other chats.
 * Windows: ShowWindow(handle, 6) = SW_MINIMIZE. macOS: hide the process.
 */
export async function minimizeKakaoTalk(): Promise<void> {
  try {
    if (process.platform === 'win32') {
      await runPowershell(
        WIN32_PREAMBLE + '\n[MWWin32]::ShowWindow($h, 6) | Out-Null\nexit 0\n'
      )
    } else if (process.platform === 'darwin') {
      await run('osascript', [
        '-e',
        'tell application "System Events" to set visible of process "KakaoTalk" to false'
      ])
    }
  } catch {
    // Best-effort: a missing KakaoTalk window must never break tab switching.
  }
}

/** Release the KakaoTalk window from its docked state (restore). */
export async function undockKakaoTalk(): Promise<DockResult> {
  try {
    if (process.platform === 'win32') {
      await runPowershell(
        WIN32_PREAMBLE + '\n[MWWin32]::ShowWindow($h, 9) | Out-Null\nexit 0\n'
      )
      return { ok: true }
    }
    // macOS: the window is free-floating already; nothing to release.
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: dockErrorReason(err) }
  }
}

// ---------------------------------------------------------------------------
// Process helpers
// ---------------------------------------------------------------------------

function run(file: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: 20000 }, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function runPowershell(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: 30000 },
      (err) => {
        if (err) reject(err)
        else resolve()
      }
    )
  })
}

function runPowershellCapture(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: 20000, encoding: 'utf8' },
      (err, stdout) => {
        if (err) reject(err)
        else resolve(stdout ?? '')
      }
    )
  })
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function dockErrorReason(err: unknown): string {
  const msg = errorMessage(err)
  // PowerShell exit code 3 = FindWindow found no KakaoTalk window.
  if (msg.includes('code 3') || msg.includes('Command failed')) {
    if (msg.includes('code 3')) {
      return 'Không tìm thấy cửa sổ KakaoTalk — hãy mở KakaoTalk trước.'
    }
  }
  if (msg.includes('chưa chạy')) {
    return 'KakaoTalk chưa chạy — hãy mở KakaoTalk trước.'
  }
  return msg
}

/** Guide page rendered inside the Kakao chat view. */
export function kakaoGuidePage(status: KakaoStatus): string {
  const body = status.installed
    ? `<p>Đã phát hiện <b>KakaoTalk Desktop</b> tại <code>${status.installPath}</code>.</p>
<p>KakaoTalk cá nhân không có bản web — MultiWork điều phối cửa sổ KakaoTalk thật:
dùng các nút <b>Mở KakaoTalk</b> và <b>Ghép cửa sổ</b> trên thanh trên cùng để đưa
cửa sổ KakaoTalk khớp khít vào khung này, và <b>Thả cửa sổ</b> khi muốn tách ra.</p>`
    : `<p>Chưa phát hiện <b>KakaoTalk Desktop</b> trên máy này.</p>
<p>Hãy cài KakaoTalk Desktop từ trang chủ Kakao, đăng nhập một lần trong ứng dụng đó,
rồi quay lại đây — MultiWork sẽ điều phối cửa sổ KakaoTalk khớp vào khung này
bằng các nút trên thanh trên cùng.</p>`
  const html = `<!doctype html><meta charset="utf-8">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#14161c;color:#c8cdd6;font-family:system-ui}
.box{max-width:520px;padding:28px}h2{color:#fee500;margin:0 0 10px}p{line-height:1.6;color:#9aa3b2;font-size:14px}
code{background:#1d2027;padding:1px 6px;border-radius:6px;color:#e6e9ee;word-break:break-all}</style>
<div class="box"><h2>KakaoTalk (Cá nhân) — cửa sổ native</h2>${body}</div>`
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}
