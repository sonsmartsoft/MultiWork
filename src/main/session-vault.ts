import { safeStorage, session, type Cookie, type Session } from 'electron'
import { AccountInstance } from '../shared/types'
import { JsonStore } from './store'

/**
 * SessionVault — the Zero Re-login engine (docs/SPRINT_1_SPEC_FOR_MUSE.md
 * §MUSE-02.2, docs/ARCHITECTURE.md §2).
 *
 * Per account it guarantees:
 *  1. A dedicated persistent partition `persist:acc_<id>` so cookies,
 *     LocalStorage, IndexedDB and Service Workers survive restarts.
 *  2. A frozen, Electron-free Chrome User-Agent, enforced both on the
 *     WebContents and at the network layer (webRequest header rewrite).
 *  3. A cookie persister: session cookies (no expirationDate — common on
 *     Zalo / Naver Works) are converted to persistent cookies (+365 days),
 *     `cookies.flushStore()` runs on every change, and an encrypted snapshot
 *     of the full cookie jar (OS Keychain / DPAPI via `safeStorage`) is kept
 *     in the store and restored on the next launch.
 */
export class SessionVault {
  private wiredPartitions = new Set<string>()
  private snapshotTimers = new Map<string, NodeJS.Timeout>()

  constructor(private readonly store: JsonStore) {}

  /**
   * Build the frozen User-Agent for a NEW account. Uses the Chromium version
   * bundled with the current Electron build and strips every `Electron/...`
   * (and app-name) token, so chat platforms keep recognising the same
   * "device" even after MultiWork is upgraded.
   */
  makeFrozenUserAgent(): string {
    const chrome = process.versions.chrome ?? '130.0.0.0'
    const platform =
      process.platform === 'darwin'
        ? 'Macintosh; Intel Mac OS X 10_15_7'
        : 'Windows NT 10.0; Win64; x64'
    return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome} Safari/537.36`
  }

  /** Return the (singleton per partition) session for an account, wired once. */
  sessionFor(account: AccountInstance): Session {
    const ses = session.fromPartition(account.partitionName, { cache: true })
    if (!this.wiredPartitions.has(account.partitionName)) {
      this.wiredPartitions.add(account.partitionName)
      this.wireSession(ses, account)
    }
    return ses
  }

  private wireSession(ses: Session, account: AccountInstance): void {
    // (2) Enforce the frozen UA on every outgoing request of this partition.
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['User-Agent'] = account.frozenUserAgent
      callback({ requestHeaders: details.requestHeaders })
    })

    // (3) Cookie persister.
    ses.cookies.on('changed', (_event, cookie, _cause, removed) => {
      if (!removed && !cookie.expirationDate) {
        void this.extendSessionCookie(ses, cookie)
      }
      void ses.cookies.flushStore()
      this.scheduleSnapshot(account, ses)
    })
  }

  /** Convert a session cookie into a persistent cookie valid for 365 days. */
  private async extendSessionCookie(ses: Session, cookie: Cookie): Promise<void> {
    try {
      if (!cookie.domain) return
      const scheme = cookie.secure ? 'https' : 'http'
      const host = cookie.domain.replace(/^\./, '')
      const url = `${scheme}://${host}${cookie.path || '/'}`
      await ses.cookies.set({
        url,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        expirationDate: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
      })
    } catch {
      // Some platform cookies reject re-setting (e.g. __Host- prefixed);
      // the encrypted snapshot below still protects the session.
    }
  }

  private scheduleSnapshot(account: AccountInstance, ses: Session): void {
    const existing = this.snapshotTimers.get(account.id)
    if (existing) clearTimeout(existing)
    this.snapshotTimers.set(
      account.id,
      setTimeout(() => {
        this.snapshotTimers.delete(account.id)
        void this.snapshotCookies(account, ses)
      }, 1500)
    )
  }

  /** Encrypt the full cookie jar of the account into the store. */
  async snapshotCookies(account: AccountInstance, ses: Session): Promise<void> {
    try {
      await ses.cookies.flushStore()
      if (!safeStorage.isEncryptionAvailable()) return
      const cookies = await ses.cookies.get({})
      const cipher = safeStorage.encryptString(JSON.stringify(cookies))
      this.store.data.cookieVault[account.id] = cipher.toString('base64')
      this.store.save()
    } catch {
      // Best effort only — the on-disk partition remains the primary vault.
    }
  }

  /** Restore the encrypted cookie snapshot (call BEFORE the view loads). */
  async restoreSnapshot(account: AccountInstance, ses: Session): Promise<void> {
    const blob = this.store.data.cookieVault[account.id]
    if (!blob || !safeStorage.isEncryptionAvailable()) return
    try {
      const plain = safeStorage.decryptString(Buffer.from(blob, 'base64'))
      const cookies = JSON.parse(plain) as Cookie[]
      const nowSec = Math.floor(Date.now() / 1000)
      for (const cookie of cookies) {
        if (cookie.expirationDate && cookie.expirationDate < nowSec) continue
        if (!cookie.domain) continue
        try {
          const scheme = cookie.secure ? 'https' : 'http'
          const host = cookie.domain.replace(/^\./, '')
          await ses.cookies.set({
            url: `${scheme}://${host}${cookie.path || '/'}`,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
            expirationDate:
              cookie.expirationDate ?? nowSec + 365 * 24 * 60 * 60
          })
        } catch {
          // Skip cookies the platform store rejects.
        }
      }
      await ses.cookies.flushStore()
    } catch {
      // Corrupted/foreign-machine snapshot (Keychain mismatch) — ignore it;
      // the partition on disk is untouched.
    }
  }

  /** Snapshot + flush every known account (used on `before-quit`). */
  async flushAll(): Promise<void> {
    for (const account of this.store.data.accounts) {
      const ses = session.fromPartition(account.partitionName, { cache: true })
      await this.snapshotCookies(account, ses)
    }
    await this.store.flush()
  }

  /** Wipe a partition completely when its account is removed. */
  async clearPartition(account: AccountInstance): Promise<void> {
    const ses = session.fromPartition(account.partitionName, { cache: true })
    await ses.clearStorageData()
    await ses.clearCache()
    delete this.store.data.cookieVault[account.id]
    this.wiredPartitions.delete(account.partitionName)
    this.store.save()
  }
}
