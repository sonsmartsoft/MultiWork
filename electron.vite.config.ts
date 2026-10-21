import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared')
      }
    }
  },
  preload: {
    // REV-01 [CRITICAL-01]: NO externalizeDepsPlugin here and the preload
    // sources must not import runtime values from shared modules — sandboxed
    // preloads cannot require("./chunks/...") at runtime, so each preload
    // bundle has to be a single self-contained file (verified after build).
    build: {
      rollupOptions: {
        input: {
          'sidebar-preload': resolve(__dirname, 'src/preload/sidebar-preload.ts'),
          'base-interceptor': resolve(__dirname, 'src/preload/recipes/base-interceptor.ts')
        }
      }
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared')
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@renderer': resolve(__dirname, 'src/renderer')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    }
  }
})
