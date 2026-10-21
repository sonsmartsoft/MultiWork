import type { MultiWorkAPI } from '../shared/types'

declare global {
  interface Window {
    multiworkAPI: MultiWorkAPI
  }
}

export {}
