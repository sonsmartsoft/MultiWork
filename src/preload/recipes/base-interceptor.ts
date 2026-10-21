import { ipcRenderer } from 'electron'
import {
  IPC_CHANNELS,
  IncomingNotificationPayload,
  UnreadUpdatedPayload
} from '../../shared/types'

/**
 * base-interceptor — preload injected into EVERY chat WebContentsView
 * (docs/SPRINT_1_SPEC_FOR_MUSE.md §MUSE-03.2).
 *
 * It observes the page at the presentation/notification layer only (the
 * "Zero Ban Risk" rule of docs/AI_WORK_ASSISTANT.md §3 — no unofficial
 * protocols, no network tampering):
 *  1. Unread count: parsed from `document.title` ("(3) Zalo" -> 3), watched
 *     with a MutationObserver plus a slow poll as fallback.
 *  2. Incoming messages: `window.Notification` (and
 *     `ServiceWorkerRegistration.showNotification`) are wrapped so every
 *     toast the web app raises is mirrored to the Main Process as
 *     `chat:incoming-notification` for the Boss & @Mention filter.
 *
 * The owning account id arrives via `--multiwork-account-id=<id>` in
 * `webPreferences.additionalArguments` (set by ViewManager).
 */

const ARG_PREFIX = '--multiwork-account-id='
const accountId =
  process.argv.find((a) => a.startsWith(ARG_PREFIX))?.slice(ARG_PREFIX.length) ??
  ''

function sendUnread(unreadCount: number): void {
  const payload: UnreadUpdatedPayload = { accountId, unreadCount }
  ipcRenderer.send(IPC_CHANNELS.CHAT_UNREAD_UPDATED, payload)
}

function sendNotification(title: string, body: string): void {
  if (!title && !body) return
  const payload: IncomingNotificationPayload = {
    accountId,
    title: title ?? '',
    body: body ?? '',
    timestamp: Date.now()
  }
  ipcRenderer.send(IPC_CHANNELS.CHAT_INCOMING_NOTIFICATION, payload)
}

// ---------------------------------------------------------------------------
// 1. Unread count from document.title
// ---------------------------------------------------------------------------

let lastUnread = -1

function checkTitle(): void {
  const match = /^\s*\((\d+)\)/.exec(document.title)
  const count = match ? parseInt(match[1], 10) : 0
  if (count !== lastUnread) {
    lastUnread = count
    sendUnread(count)
  }
}

function watchTitle(): void {
  checkTitle()
  const titleEl = document.querySelector('title')
  if (titleEl) {
    new MutationObserver(checkTitle).observe(titleEl, {
      childList: true,
      characterData: true
    })
  }
  // Fallback in case the <title> node is replaced wholesale.
  setInterval(checkTitle, 3000)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', watchTitle)
} else {
  watchTitle()
}

// ---------------------------------------------------------------------------
// 2. Notification wrapping
// ---------------------------------------------------------------------------

try {
  const OriginalNotification = window.Notification
  if (OriginalNotification) {
    class MultiWorkNotification extends OriginalNotification {
      constructor(title: string, options?: NotificationOptions) {
        super(title, options)
        try {
          sendNotification(title, options?.body ?? '')
        } catch {
          /* never break the host app */
        }
      }
    }
    // Preserve the standard statics the web apps rely on.
    Object.defineProperty(MultiWorkNotification, 'permission', {
      get: () => OriginalNotification.permission
    })
    Object.defineProperty(MultiWorkNotification, 'requestPermission', {
      value: OriginalNotification.requestPermission.bind(OriginalNotification)
    })
    window.Notification = MultiWorkNotification
  }
} catch {
  // Some web apps freeze window.Notification — title-based unread still works.
}

try {
  const proto = window.ServiceWorkerRegistration?.prototype
  if (proto && typeof proto.showNotification === 'function') {
    const original = proto.showNotification
    proto.showNotification = function (
      this: ServiceWorkerRegistration,
      title: string,
      options?: NotificationOptions
    ): Promise<void> {
      try {
        sendNotification(title, options?.body ?? '')
      } catch {
        /* ignore */
      }
      return original.call(this, title, options)
    }
  }
} catch {
  /* ignore */
}
