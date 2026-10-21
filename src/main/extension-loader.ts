import { app, type Session } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { LineStatus } from '../shared/types'
import { JsonStore } from './store'

/** Official LINE extension id on the Chrome Web Store. */
export const LINE_WEBSTORE_ID = 'ophjlpahpchlmihnnnihgmmeilfjmjjc'
export const LINE_WEBSTORE_URL = `https://chromewebstore.google.com/detail/line/${LINE_WEBSTORE_ID}`

export interface LoadedExtension {
  extensionId: string
  dir: string
  source: 'custom' | 'userData' | 'resources'
}

interface CandidateDir {
  dir: string
  source: LoadedExtension['source']
}

/**
 * ExtensionLoader — Sprint 2 (MUSE-04): loads the official LINE Chrome
 * extension into a chat account's session partition.
 *
 * LINE personal accounts have no official web client; the sanctioned route
 * is the LINE Chrome extension (Web Store id above) running inside the
 * account's own persistent session. The loader looks for an unpacked
 * extension folder (a directory containing manifest.json) in, in order:
 *   1. the folder the user picked in the UI (`store.lineExtensionDir`),
 *   2. `<userData>/extensions/line`,
 *   3. `<resources>/extensions/line` (bundled) or `<app>/resources/...` (dev).
 * When nothing is found, ViewManager shows the built-in guide page instead.
 */
export class ExtensionLoader {
  private loadedByPartition = new Map<string, LoadedExtension>()
  private lastLoaded: LoadedExtension | null = null

  constructor(private readonly store: JsonStore) {}

  candidateDirs(): CandidateDir[] {
    const out: CandidateDir[] = []
    if (this.store.data.lineExtensionDir) {
      out.push({ dir: this.store.data.lineExtensionDir, source: 'custom' })
    }
    out.push({
      dir: path.join(app.getPath('userData'), 'extensions', 'line'),
      source: 'userData'
    })
    if (process.resourcesPath) {
      out.push({
        dir: path.join(process.resourcesPath, 'extensions', 'line'),
        source: 'resources'
      })
    }
    out.push({
      dir: path.join(app.getAppPath(), 'resources', 'extensions', 'line'),
      source: 'resources'
    })
    return out
  }

  private dirHasManifest(dir: string): boolean {
    try {
      return fs.existsSync(path.join(dir, 'manifest.json'))
    } catch {
      return false
    }
  }

  /** First candidate folder that actually holds an unpacked extension. */
  resolveDir(): CandidateDir | null {
    return this.candidateDirs().find((c) => this.dirHasManifest(c.dir)) ?? null
  }

  status(): LineStatus {
    const found = this.resolveDir()
    return {
      available: found !== null,
      dir: found?.dir ?? this.lastLoaded?.dir,
      extensionId: this.lastLoaded?.extensionId,
      webStoreId: LINE_WEBSTORE_ID
    }
  }

  /**
   * Load the LINE extension into the given session (idempotent per
   * partition). Returns null when no extension folder exists on disk.
   */
  async ensureLoaded(
    ses: Session,
    partitionName: string
  ): Promise<LoadedExtension | null> {
    const cached = this.loadedByPartition.get(partitionName)
    if (cached) return cached
    const found = this.resolveDir()
    if (!found) return null
    try {
      const ext = await ses.loadExtension(found.dir, { allowFileAccess: true })
      const loaded: LoadedExtension = {
        extensionId: ext.id,
        dir: found.dir,
        source: found.source
      }
      this.loadedByPartition.set(partitionName, loaded)
      this.lastLoaded = loaded
      return loaded
    } catch {
      // Corrupt folder / manifest mismatch — the guide page explains how
      // to provide a clean unpacked copy.
      return null
    }
  }

  /** Landing URL of the loaded LINE extension app. */
  extensionUrl(extensionId: string): string {
    return `chrome-extension://${extensionId}/index.html`
  }

  /** Built-in setup guide shown in the LINE view when nothing is loaded. */
  guidePage(): string {
    const userDataDir = path.join(
      app.getPath('userData'),
      'extensions',
      'line'
    )
    const html = `<!doctype html><meta charset="utf-8">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#14161c;color:#c8cdd6;font-family:system-ui}
.box{max-width:520px;padding:28px}h2{color:#06c755;margin:0 0 10px}p,li{line-height:1.6;color:#9aa3b2;font-size:14px}
code{background:#1d2027;padding:1px 6px;border-radius:6px;color:#e6e9ee;word-break:break-all}
a{color:#06c755}</style>
<div class="box"><h2>LINE (Cá nhân) — cần Extension chính thức</h2>
<p>LINE cá nhân không có bản web; MultiWork chạy <b>LINE Chrome Extension chính thức</b>
(mã Web Store: <code>${LINE_WEBSTORE_ID}</code>) ngay trong phiên đăng nhập riêng của tài khoản.</p>
<ol>
<li>Mở <a href="${LINE_WEBSTORE_URL}">trang LINE trên Chrome Web Store</a> bằng Chrome, bấm <b>Thêm vào Chrome</b> một lần để tải extension về máy.</li>
<li>Giải nén / sao chép thư mục extension (thư mục có file <code>manifest.json</code>) vào:<br/><code>${userDataDir}</code></li>
<li>Hoặc bấm nút <b>📁 Thư mục Extension LINE</b> trên thanh trên cùng của MultiWork và trỏ tới thư mục đó.</li>
<li>Chuyển sang tài khoản LINE lần nữa — extension sẽ tự nạp và mở giao diện LINE.</li>
</ol></div>`
    return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
  }
}
