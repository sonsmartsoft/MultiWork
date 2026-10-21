import { ipcRenderer, webFrame } from 'electron'
import type {
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
 *     `ServiceWorkerRegistration.showNotification`) are wrapped IN THE
 *     PAGE'S MAIN WORLD so every toast the web app raises is mirrored to
 *     the Main Process as `chat:incoming-notification` for the Boss &
 *     @Mention filter.
 *
 * REV-01 fixes:
 *  - [CRITICAL-01] This file must stay a SINGLE self-contained bundle:
 *    sandboxed preloads cannot require("./chunks/..."), so the IPC channel
 *    names are inlined below as literals. They MUST stay in sync with
 *    `IPC_CHANNELS` in src/shared/types.ts (only type-only imports are
 *    allowed from shared modules — they are erased at build time).
 *  - [CRITICAL-02] With contextIsolation, this preload runs in an Isolated
 *    World: assigning `window.Notification` here never touches the page's
 *    Main World. The hook is therefore installed inside the Main World via
 *    `webFrame.executeJavaScript`, and notifications travel back over a
 *    DOM CustomEvent (events on window/document are shared between worlds).
 *
 * The owning account id arrives via `--multiwork-account-id=<id>` in
 * `webPreferences.additionalArguments` (set by ViewManager). It is only a
 * hint: since REV-01 [CRITICAL-03] the Main Process authoritatively
 * resolves the account from `event.sender`, so an empty id here is fine.
 */

// Inlined IPC channel literals — keep in sync with IPC_CHANNELS
// (src/shared/types.ts). See [CRITICAL-01] note above.
const CH_UNREAD_UPDATED = 'chat:unread-updated'
const CH_INCOMING_NOTIFICATION = 'chat:incoming-notification'

const NOTIFICATION_EVENT = '__multiwork_notification__'

const ARG_PREFIX = '--multiwork-account-id='
const accountId =
  process.argv.find((a) => a.startsWith(ARG_PREFIX))?.slice(ARG_PREFIX.length) ??
  ''

function sendUnread(unreadCount: number): void {
  const payload: UnreadUpdatedPayload = { accountId, unreadCount }
  ipcRenderer.send(CH_UNREAD_UPDATED, payload)
}

function sendNotification(title: string, body: string): void {
  if (!title && !body) return
  const payload: IncomingNotificationPayload = {
    accountId,
    title: title ?? '',
    body: body ?? '',
    timestamp: Date.now()
  }
  ipcRenderer.send(CH_INCOMING_NOTIFICATION, payload)
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
// 2. Notification bridge (REV-01 [CRITICAL-02] — Main-World hook)
// ---------------------------------------------------------------------------

// Isolated-World side: DOM events are shared with the Main World, so the
// CustomEvent dispatched by the injected hook lands here.
window.addEventListener(NOTIFICATION_EVENT, ((event: CustomEvent) => {
  const detail = event.detail as { title?: string; body?: string } | undefined
  if (detail) sendNotification(detail.title ?? '', detail.body ?? '')
}) as EventListener)

// Main-World side: install the actual Notification wrappers inside the
// page's own JavaScript world. The string is plain page-context JS — it
// must not reference anything from this preload file.
const MAIN_WORLD_HOOK = `
;(function () {
  if (window.__multiworkNotificationHooked) return;
  window.__multiworkNotificationHooked = true;
  var EVENT_NAME = '${NOTIFICATION_EVENT}';
  function emit(title, options) {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, {
        detail: {
          title: String(title || ''),
          body: String((options && options.body) || '')
        }
      }));
    } catch (e) { /* never break the host app */ }
  }
  try {
    var OriginalNotification = window.Notification;
    if (OriginalNotification) {
      var MultiWorkNotification = function (title, options) {
        emit(title, options);
        return new OriginalNotification(title, options);
      };
      MultiWorkNotification.prototype = OriginalNotification.prototype;
      Object.defineProperty(MultiWorkNotification, 'permission', {
        get: function () { return OriginalNotification.permission; }
      });
      MultiWorkNotification.requestPermission =
        OriginalNotification.requestPermission.bind(OriginalNotification);
      if (OriginalNotification.maxActions !== undefined) {
        MultiWorkNotification.maxActions = OriginalNotification.maxActions;
      }
      window.Notification = MultiWorkNotification;
    }
  } catch (e) { /* page froze window.Notification — title unread still works */ }
  try {
    var proto = window.ServiceWorkerRegistration &&
      window.ServiceWorkerRegistration.prototype;
    if (proto && typeof proto.showNotification === 'function') {
      var originalShow = proto.showNotification;
      proto.showNotification = function (title, options) {
        emit(title, options);
        return originalShow.call(this, title, options);
      };
    }
  } catch (e) { /* ignore */ }
})();
`

void webFrame.executeJavaScript(MAIN_WORLD_HOOK).catch(() => {
  // Some pages (e.g. chrome-extension://) refuse script injection; the
  // title-based unread signal and the Main-side fallback still work.
})
