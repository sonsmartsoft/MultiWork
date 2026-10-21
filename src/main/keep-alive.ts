import { SessionVault } from './session-vault'
import { JsonStore } from './store'

const TICK_MS = 60_000

/**
 * KeepAlive — anti idle-session-timeout heartbeat
 * (docs/SPRINT_1_SPEC_FOR_MUSE.md §MUSE-02.4).
 *
 * Every minute it checks each account; when the account's own interval
 * (default 15 minutes) has elapsed it:
 *  - flushes the partition cookie store to disk, and
 *  - issues a lightweight HEAD request to the service origin through the
 *    account's own session, so Zalo / Naver Works / Messenger keep seeing
 *    an active session even while the user is not looking at that tab.
 */
export class KeepAliveService {
  private timer: NodeJS.Timeout | null = null
  private lastRunByAccount = new Map<string, number>()

  constructor(
    private readonly store: JsonStore,
    private readonly vault: SessionVault
  ) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      void this.tick()
    }, TICK_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private async tick(): Promise<void> {
    const now = Date.now()
    for (const account of this.store.data.accounts) {
      if (!account.homeUrl) continue
      const intervalMs = Math.max(1, account.keepAliveIntervalMinutes) * 60_000
      const last = this.lastRunByAccount.get(account.id) ?? 0
      if (now - last < intervalMs) continue
      this.lastRunByAccount.set(account.id, now)
      const ses = this.vault.sessionFor(account)
      try {
        await ses.cookies.flushStore()
        if (typeof ses.fetch === 'function') {
          await ses.fetch(account.homeUrl, { method: 'HEAD' })
        }
      } catch {
        // Network hiccup or a redirect the HEAD cannot follow — the cookie
        // flush above already did the important part; retry next interval.
      }
    }
  }
}
