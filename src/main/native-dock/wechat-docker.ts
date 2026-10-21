import { execFile, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import type { DockResult, WeChatStatus } from '../../shared/types'

/**
 * WeChatDocker — WeChat native window coordinator (same pattern as
 * MUSE-05's KakaoDocker).
 *
 * Tencent blocks Web WeChat (web.wechat.com) logins for many accounts —
 * the page itself answers "this service is not available for your
 * account" — so for those accounts the only official route left is the
 * WeChat DESKTOP app. MultiWork therefore coordinates the desktop app's
 * window exactly like KakaoTalk: detect the installation, launch it,
 * and dock its window over MultiWork's chat viewport, with the same
 * auto-follow / auto-hide lifecycle (MUSE-08 pattern).
 *
 * No native addons: PowerShell + inline C# P/Invoke on Windows,
 * `osascript` on macOS. The WeChat main window is found by its window
 * class ("WeChatMainWndForPC"), falling back to the "WeChat" / "微信"
 * window titles.
 */

export interface ScreenBounds {
  x: number
  y: number
  width: number
  height: number
}

function windowsCandidates(): string[] {
  const bases = [
    process.env['ProgramFiles(x86)'],
    process.env['ProgramFiles'],
    process.env['LOCALAPPDATA']
  ].filter((b): b is string => typeof b === 'string' && b.length > 0)
  const rels = [
    path.join('Tencent', 'WeChat', 'WeChat.exe'),
    // WeChat 4.x installs under the Weixin name.
    path.join('Tencent', 'Weixin', 'Weixin.exe')
  ]
  const out: string[] = []
  for (const b of bases) for (const r of rels) out.push(path.join(b, r))
  return out
}

const MAC_APP_PATH = '/Applications/WeChat.app'

/** Exe path found by the deep (registry) probe, reused by sync checks. */
let cachedExePath: string | undefined

export function detectWeChat(): WeChatStatus {
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
  Where-Object { $_.DisplayName -like '*WeChat*' -or $_.DisplayName -like '*Weixin*' -or $_.DisplayName -like '*微信*' } |
  Select-Object -First 1
if ($app) {
  Write-Output $app.InstallLocation
  Write-Output $app.DisplayIcon
}
`

/**
 * Deep detection: fixed install paths can miss custom locations, so on
 * Windows also probe the Uninstall registry keys for WeChat/Weixin and
 * verify the exe exists.
 */
export async function detectWeChatDeep(): Promise<WeChatStatus> {
  const quick = detectWeChat()
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
      candidates.push(path.join(cleaned, 'WeChat.exe'))
      candidates.push(path.join(cleaned, 'Weixin.exe'))
      candidates.push(path.join(cleaned, 'Tencent', 'WeChat', 'WeChat.exe'))
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

/** Launch the WeChat desktop app (or focus it if already running). */
export async function launchWeChat(): Promise<DockResult> {
  const status = await detectWeChatDeep()
  if (!status.installed || !status.installPath) {
    return {
      ok: false,
      reason: 'Chưa phát hiện WeChat Desktop trên máy này.'
    }
  }
  try {
    if (process.platform === 'darwin') {
      await run('open', ['-a', 'WeChat'])
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
public static class MWWin32WeChat {
  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
$h = [MWWin32WeChat]::FindWindow("WeChatMainWndForPC", $null)
if ($h -eq [IntPtr]::Zero) { $h = [MWWin32WeChat]::FindWindow($null, "WeChat") }
if ($h -eq [IntPtr]::Zero) { $h = [MWWin32WeChat]::FindWindow($null, "微信") }
if ($h -eq [IntPtr]::Zero) { exit 3 }
`

function fillBounds(script: string, b: ScreenBounds): string {
  return script
    .replaceAll('__X__', String(Math.round(b.x)))
    .replaceAll('__Y__', String(Math.round(b.y)))
    .replaceAll('__W__', String(Math.round(b.width)))
    .replaceAll('__H__', String(Math.round(b.height)))
}

/** Move/resize the WeChat window exactly over the given screen rect. */
export async function dockWeChat(bounds: ScreenBounds): Promise<DockResult> {
  try {
    if (process.platform === 'win32') {
      const script = fillBounds(
        WIN32_PREAMBLE +
          `
[MWWin32WeChat]::ShowWindow($h, 9) | Out-Null
$ok = [MWWin32WeChat]::SetWindowPos($h, [IntPtr]::Zero, __X__, __Y__, __W__, __H__, 0x0040)
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
  if not (exists process "WeChat") then error "WeChat chưa chạy"
  tell process "WeChat"
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
 * Minimize/hide the WeChat window (MUSE-08 pattern): used when the user
 * switches away from the WeChat account or a shell modal covers the
 * viewport, so the docked window never floats over other chats.
 */
export async function minimizeWeChat(): Promise<void> {
  try {
    if (process.platform === 'win32') {
      await runPowershell(
        WIN32_PREAMBLE + '\n[MWWin32WeChat]::ShowWindow($h, 6) | Out-Null\nexit 0\n'
      )
    } else if (process.platform === 'darwin') {
      await run('osascript', [
        '-e',
        'tell application "System Events" to set visible of process "WeChat" to false'
      ])
    }
  } catch {
    // Best-effort: a missing WeChat window must never break tab switching.
  }
}

/** Release the WeChat window from its docked state (restore). */
export async function undockWeChat(): Promise<DockResult> {
  try {
    if (process.platform === 'win32') {
      await runPowershell(
        WIN32_PREAMBLE + '\n[MWWin32WeChat]::ShowWindow($h, 9) | Out-Null\nexit 0\n'
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
  // PowerShell exit code 3 = no WeChat main window found.
  if (msg.includes('code 3')) {
    return 'Không tìm thấy cửa sổ WeChat — hãy mở WeChat trước.'
  }
  if (msg.includes('chưa chạy')) {
    return 'WeChat chưa chạy — hãy mở WeChat trước.'
  }
  return msg
}

/** Guide page rendered inside the WeChat chat view. */
export function wechatGuidePage(status: WeChatStatus): string {
  const body = status.installed
    ? `<p>Đã phát hiện <b>WeChat Desktop</b> tại <code>${status.installPath}</code>.</p>
<p>Web WeChat bị Tencent khóa với nhiều tài khoản ("Dịch vụ này hiện không khả dụng
với tài khoản của bạn") nên MultiWork điều phối cửa sổ WeChat Desktop thật: dùng các
nút <b>Mở WeChat</b> và <b>Ghép cửa sổ</b> trên thanh trên cùng để đưa cửa sổ WeChat
khớp khít vào khung này, và <b>Thả cửa sổ</b> khi muốn tách ra.</p>`
    : `<p>Chưa phát hiện <b>WeChat Desktop</b> trên máy này.</p>
<p>Hãy cài WeChat Desktop từ trang chủ WeChat (weixin.qq.com / wechat.com), đăng nhập
một lần trong ứng dụng đó, rồi quay lại đây — MultiWork sẽ điều phối cửa sổ WeChat
khớp vào khung này bằng các nút trên thanh trên cùng.</p>`
  const html = `<!doctype html><meta charset="utf-8">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#14161c;color:#c8cdd6;font-family:system-ui}
.box{max-width:520px;padding:28px}h2{color:#07c160;margin:0 0 10px}p{line-height:1.6;color:#9aa3b2;font-size:14px}
code{background:#1d2027;padding:1px 6px;border-radius:6px;color:#e6e9ee;word-break:break-all}
a{color:#07c160}</style>
<div class="box"><h2>WeChat — cửa sổ native</h2>${body}
<p>Nếu tài khoản của bạn vẫn dùng được Web WeChat, bạn có thể <a href="https://web.wechat.com">mở Web WeChat trong khung này</a>.</p></div>`
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}
