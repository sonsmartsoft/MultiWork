import { create } from 'zustand'
import type { AccountInstance, AddAccountPayload } from '../../shared/types'

interface AccountsState {
  accounts: AccountInstance[]
  activeId: string | null
  initialized: boolean
  init: () => Promise<void>
  add: (payload: AddAccountPayload) => Promise<AccountInstance>
  switchTo: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  setUnread: (accountId: string, unreadCount: number) => void
}

let unsubscribeUnread: (() => void) | null = null

export const useAccountsStore = create<AccountsState>()((set, get) => ({
  accounts: [],
  activeId: null,
  initialized: false,

  init: async () => {
    if (get().initialized) return
    set({ initialized: true })
    const accounts = await window.multiworkAPI.listAccounts()
    set({
      accounts,
      activeId: get().activeId ?? accounts[0]?.id ?? null
    })
    unsubscribeUnread?.()
    unsubscribeUnread = window.multiworkAPI.onUnreadUpdated((payload) => {
      get().setUnread(payload.accountId, payload.unreadCount)
    })
  },

  add: async (payload) => {
    const account = await window.multiworkAPI.addAccount(payload)
    set((s) => ({
      accounts: [...s.accounts, account],
      activeId: account.id
    }))
    return account
  },

  switchTo: async (id) => {
    set({ activeId: id })
    await window.multiworkAPI.switchAccount({ accountId: id })
  },

  remove: async (id) => {
    const ok = await window.multiworkAPI.removeAccount({ accountId: id })
    if (!ok) return
    set((s) => {
      const accounts = s.accounts.filter((a) => a.id !== id)
      return {
        accounts,
        activeId:
          s.activeId === id ? (accounts[0]?.id ?? null) : s.activeId
      }
    })
  },

  setUnread: (accountId, unreadCount) => {
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === accountId ? { ...a, unreadCount } : a
      )
    }))
  }
}))
