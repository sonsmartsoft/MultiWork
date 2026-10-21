import { app, BaseWindow, WebContentsView } from 'electron'
import path from 'node:path'
import { IPC_CHANNELS, LAYOUT } from '../shared/types'
import { registerIpcHandlers } from './ipc-handlers'
import { KeepAliveService } from './keep-alive'
import { SessionVault } from './session-vault'
import { JsonStore } from './store'
import { ViewManager } from './view-manager'

const SIDEBAR_PRELOAD = path.join(__dirname, '../preload/sidebar-preload.js')

let mainWindow: BaseWindow | null = null
let shellView: WebContentsView | null = null
let viewManager: ViewManager | null = null
let keepAlive: KeepAliveService | null = null
let vaultRef: SessionVault | null = null
let quitFlushDone = false

async function createWindow(): Promise<void> {
  const store = await JsonStore.load(app.getPath('userData'))
  const vault = new SessionVault(store)
  vaultRef = vault

  mainWindow = new BaseWindow({
    width: LAYOUT.DEFAULT_WINDOW_WIDTH,
    height: LAYOUT.DEFAULT_WINDOW_HEIGHT,
    minWidth: LAYOUT.MIN_WINDOW_WIDTH,
    minHeight: LAYOUT.MIN_WINDOW_HEIGHT,
    show: false,
    backgroundColor: '#0f1115',
    title: 'MultiWork',
    autoHideMenuBar: true
  })

  // Shell UI (React) — a full-window view added FIRST, so chat views stack
  // above it only inside the center viewport rectangle.
  shellView = new WebContentsView({
    webPreferences: {
      preload: SIDEBAR_PRELOAD,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })
  mainWindow.contentView.addChildView(shellView)
  const fitShell = (): void => {
    if (!mainWindow || !shellView) return
    const { width, height } = mainWindow.getContentBounds()
    shellView.setBounds({ x: 0, y: 0, width, height })
  }
  fitShell()

  viewManager = new ViewManager(mainWindow, vault, store, (payload) => {
    shellView?.webContents.send(IPC_CHANNELS.CHAT_UNREAD_UPDATED, payload)
  })

  registerIpcHandlers({
    store,
    vault,
    viewManager,
    shellWebContents: () => shellView?.webContents ?? null
  })

  keepAlive = new KeepAliveService(store, vault)
  keepAlive.start()

  mainWindow.on('resize', () => {
    fitShell()
    viewManager?.handleResize()
  })
  mainWindow.on('closed', () => {
    mainWindow = null
    shellView = null
    viewManager = null
  })

  // Restore every saved account's view (hidden) so sessions and unread
  // badges stay live; show the last active one.
  for (const account of store.data.accounts) {
    await viewManager.ensureView(account)
  }
  const initial =
    store.data.activeAccountId ?? store.data.accounts[0]?.id ?? null
  if (initial) await viewManager.switchTo(initial)

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    await shellView.webContents.loadURL(devUrl)
  } else {
    await shellView.webContents.loadFile(
      path.join(__dirname, '../renderer/index.html')
    )
  }

  mainWindow.show()
}

app.whenReady().then(() => {
  void createWindow()
  app.on('activate', () => {
    if (mainWindow === null) void createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Acceptance #4: flush every cookie store (and refresh the encrypted
// snapshots) before the app actually exits.
app.on('before-quit', (event) => {
  if (quitFlushDone || !vaultRef) return
  event.preventDefault()
  keepAlive?.stop()
  vaultRef
    .flushAll()
    .catch(() => undefined)
    .finally(() => {
      quitFlushDone = true
      app.quit()
    })
})
