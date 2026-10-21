import { promises as fs } from 'node:fs'
import path from 'node:path'
import { AccountInstance, BossWatchRule, DEFAULT_BOSS_RULE } from '../shared/types'

/**
 * Local persistence for MultiWork (accounts, boss rule, encrypted cookie
 * vault, last active account). Plain JSON file inside `userData`, written
 * atomically (tmp file + rename). Cookie snapshots themselves are stored
 * encrypted by SessionVault via `safeStorage` — this store only keeps the
 * resulting base64 ciphertext.
 */
export interface StoreData {
  accounts: AccountInstance[]
  bossRule: BossWatchRule
  activeAccountId: string | null
  /** accountId -> base64(safeStorage ciphertext of the cookie JSON array) */
  cookieVault: Record<string, string>
}

const DEFAULT_DATA: StoreData = {
  accounts: [],
  bossRule: DEFAULT_BOSS_RULE,
  activeAccountId: null,
  cookieVault: {}
}

export class JsonStore {
  readonly data: StoreData
  private saveTimer: NodeJS.Timeout | null = null

  private constructor(
    private readonly filePath: string,
    data: StoreData
  ) {
    this.data = data
  }

  static async load(userDataPath: string): Promise<JsonStore> {
    const filePath = path.join(userDataPath, 'multiwork-store.json')
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<StoreData>
      return new JsonStore(filePath, {
        accounts: parsed.accounts ?? [],
        bossRule: { ...DEFAULT_BOSS_RULE, ...(parsed.bossRule ?? {}) },
        activeAccountId: parsed.activeAccountId ?? null,
        cookieVault: parsed.cookieVault ?? {}
      })
    } catch {
      return new JsonStore(filePath, { ...DEFAULT_DATA })
    }
  }

  getAccount(id: string): AccountInstance | undefined {
    return this.data.accounts.find((a) => a.id === id)
  }

  /** Debounced write-through persistence. */
  save(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      void this.flush()
    }, 200)
  }

  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    const tmp = `${this.filePath}.tmp`
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    await fs.writeFile(tmp, JSON.stringify(this.data, null, 2), 'utf-8')
    await fs.rename(tmp, this.filePath)
  }
}
