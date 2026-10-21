# 🔍 Báo Cáo Nghiệm Thu Sprint 1 (`REV-01`) & Đặc Tả Kỹ Thuật Sprint 2 Dành Cho Muse.ai

> **Người kiểm định & Thiết kế (Architect & QA Reviewer):** Antigravity  
> **Đơn vị thực thi (Lead Developer):** Muse.ai  
> **Commits được kiểm định:** `627a4fe`, `238f536`, `4822dd6`, `d358dd9`

---

## Phần 1: Kết Quả Kiểm Định Sprint 1 (`REV-01`)

### 1.1. Đánh giá tổng quan & Các điểm làm rất tốt
Architect đã pull code về máy local, chạy kiểm thử thực tế (`npm install`, `npm run typecheck`, `npm run build`) và đọc rà soát từng dòng code trong 34 files:
- ✅ **Biên dịch & Type-check (`Acceptance #1`)**: Pass 100%. Cả 3 cấu hình TypeScript (`tsconfig.json`, `tsconfig.node.json`, `tsconfig.preload.json`) và `electron-vite build` đều biên dịch sạch, không có lỗi.
- ✅ **Tổ chức Kiến trúc & Bố cục 3 cột (`Acceptance #2`, `#3`, `#6`)**: Thiết kế `BaseWindow` + `shellView` + `ViewManager` rất chuẩn xác. Chủ động bổ sung các kênh IPC mở rộng (`layout:set-sidebar-width`, `layout:set-chat-visible`) để ẩn `WebContentsView` khi mở Modal là một quyết định kỹ thuật rất tốt.
- ✅ **Bảo mật & Session Vault (`Acceptance #4`)**: Đã áp dụng `safeStorage` (DPAPI / Keychain) để mã hóa Cookie Snapshot, xóa `Electron/...` khỏi User-Agent cả ở `webContents` lẫn `webRequest.onBeforeSendHeaders`, và có hook `before-quit` để `flushAll()`.

---

### 1.2. 🚨 5 Lỗi Kỹ Thuật Cần Muse.ai Khắc Phục Ngay (`MUSE-FIX-01`)

Qua kiểm tra sâu file build đầu ra (`out/preload/*.js`) và cơ chế Chromium Isolation của Electron 33, Architect phát hiện **3 lỗi Critical**, **1 lỗi High** và **1 lỗi Medium** cần Muse.ai sửa trước khi chuyển sang các tính năng của Sprint 2:

#### 🔴 [CRITICAL-01] Sandboxed Preload bị lỗi `require("./chunks/types-*.js")` lúc chạy thực tế
- **Hiện tượng & Nguyên nhân**:
  - Khi chạy `electron-vite build`, vì cả `sidebar-preload.ts` và `base-interceptor.ts` cùng import `IPC_CHANNELS` từ `src/shared/types.ts`, Rollup đã tách `types.ts` ra thành một chunk riêng (`out/preload/chunks/types-BqWe2oyp.js`) và sinh ra dòng lệnh ở đầu cả 2 file preload:
    ```js
    const types = require("./chunks/types-BqWe2oyp.js");
    ```
  - Tuy nhiên, trong `src/main/index.ts` (dòng 41) và `src/main/view-manager.ts` (dòng 88), cả `shellView` và `view` đều bật `sandbox: true`.
  - Trong Electron 20+ (hiện tại là Electron 33), môi trường **Sandboxed Preload KHÔNG có quyền đọc file hệ thống nên KHÔNG thể `require("./chunks/...")`** (chỉ được phép `require("electron")` và một vài module ảo nội bộ). Điều này làm preload văng lỗi `Error: module not found: ./chunks/types-...` và khiến `window.multiworkAPI` bị `undefined`!
- **Yêu cầu cách sửa**:
  - Đảm bảo 2 file kết quả sau khi build (`out/preload/sidebar-preload.js` và `out/preload/base-interceptor.js`) là **self-contained 100% (không sinh thư mục `out/preload/chunks/` và không có bất kỳ lệnh `require("./...")` nào ngoài `require("electron")`)**.
  - *Gợi ý*: Trong `electron.vite.config.ts`, không dùng `externalizeDepsPlugin()` cho `preload` kết hợp với việc cấu hình Rollup inline toàn bộ hoặc tách hằng số `IPC_CHANNELS` / inline trực tiếp vào từng file preload để Rollup không tạo shared chunk giữa 2 entry preload. Sau khi chạy `npm run build`, hãy kiểm tra chắc chắn trong `out/preload/sidebar-preload.js` và `out/preload/base-interceptor.js` không còn dòng `require("./chunks/...")`.

#### 🔴 [CRITICAL-02] `base-interceptor.ts` ghi đè `window.Notification` trong Isolated World nên không bắt được thông báo của Zalo / Messenger / Telegram
- **Hiện tượng & Nguyên nhân**:
  - Trong `src/main/view-manager.ts` (dòng 87), các chat view đều bật `contextIsolation: true`.
  - Khi `contextIsolation: true`, file preload `base-interceptor.ts` chạy trong **Isolated World** (có biến toàn cục `window` riêng biệt với **Main World** của trang web Zalo/Messenger/Naver Works/Telegram).
  - Do đó, đoạn code `window.Notification = MultiWorkNotification` ở dòng 105 của `src/preload/recipes/base-interceptor.ts` chỉ thay thế `window.Notification` trong Isolated World, còn khi trang web Zalo/Messenger gọi `new window.Notification(title, options)` ở Main World thì nó vẫn gọi hàm gốc của Chromium $\rightarrow$ **Preload không bắt được bất kỳ thông báo tin nhắn mới nào!**
- **Yêu cầu cách sửa (Main-World Bridge Pattern)**:
  - Trong `base-interceptor.ts`:
    1. Ở **Isolated World (Preload)**: Lắng nghe sự kiện `CustomEvent` trên `window` (vì DOM và hệ thống Event trên `window`/`document` được chia sẻ giữa Main World và Isolated World):
       ```ts
       window.addEventListener('__multiwork_notification__', ((event: CustomEvent<{ title: string; body: string }>) => {
         if (event.detail) {
           sendNotification(event.detail.title, event.detail.body)
         }
       }) as EventListener)
       ```
    2. Dùng `webFrame.executeJavaScript(...)` (từ `import { ipcRenderer, webFrame } from 'electron'`) hoặc inject thẻ `<script>` vào `document.documentElement` để bọc `window.Notification` và `ServiceWorkerRegistration.prototype.showNotification` **ngay bên trong Main World**, sao cho mỗi khi có thông báo mới, Main World bắn sự kiện:
       ```js
       window.dispatchEvent(new CustomEvent('__multiwork_notification__', {
         detail: { title: String(title || ''), body: String((options && options.body) || '') }
       }));
       ```

#### 🔴 [CRITICAL-03] Không phụ thuộc vào `process.argv` (`additionalArguments`) trong Sandboxed Preload để định danh `accountId`
- **Hiện tượng & Nguyên nhân**:
  - Trong `base-interceptor.ts` (dòng 28), `accountId` được đọc từ `process.argv.find(...)`. Khi `sandbox: true` trên một số nền tảng, `process.argv` trong sandboxed preload có thể không chứa `additionalArguments`, làm `accountId` thành chuỗi rỗng `""`.
  - Khi đó ở `src/main/ipc-handlers.ts` (dòng 140 & 149), điều kiện `if (!accountId || payload.accountId !== accountId) return` sẽ chặn toàn bộ tín hiệu!
- **Yêu cầu cách sửa**:
  - Trong `src/main/ipc-handlers.ts` (dòng 138–160): Main Process **đã xác định được chính xác và an toàn tuyệt đối** `accountId` từ `const accountId = viewManager.accountIdForWebContents(event.sender.id)`.
  - Do đó, hãy sửa điều kiện thành:
    ```ts
    const accountId = viewManager.accountIdForWebContents(event.sender.id)
    if (!accountId) return
    if (payload.accountId && payload.accountId !== accountId) return
    ```
    Và sử dụng `accountId` của `viewManager` làm chuẩn cho các bước tiếp theo.

#### 🟠 [HIGH-04] Lưu trữ bền vững `directives`, `todos`, `events` vào `JsonStore` (`multiwork-store.json`)
- **Hiện tượng & Nguyên nhân**:
  - Hiện tại `directives`, `todos`, `events` chỉ nằm trên RAM của Zustand (`useAssistantStore.ts`). Khi người dùng tắt MultiWork mở lại, toàn bộ danh sách công việc Sếp giao (`TodoItem`), lịch hẹn (`ScheduleEvent`) và lịch sử chỉ thị (`BossDirective`) bị mất sạch.
- **Yêu cầu cách sửa**:
  - Bổ sung `directives: BossDirective[]`, `todos: TodoItem[]`, `events: ScheduleEvent[]` vào `StoreData` trong `src/main/store.ts`.
  - Khi `ipc-handlers.ts` nhận được chỉ thị mới từ `evaluateNotification`, tự động lưu `directive` (và `todo` / `event` nếu có) vào `store.data` và gọi `store.save()`.
  - Bổ sung IPC (`assistant:get-state`, `assistant:save-todos`, `assistant:save-events` hoặc tương đương trong `IPC_CHANNELS` và `MultiWorkAPI`) để khi mở lại ứng dụng, `useAssistantStore.init()` tải lại đầy đủ danh sách Chỉ thị, To-Do và Lịch trình đã lưu trên ổ cứng, đồng thời khi người dùng thêm/xóa/tick hoàn thành To-Do trên UI thì cũng được lưu xuống `JsonStore`.

#### 🟡 [MEDIUM-05] Tránh gọi `ses.cookies.flushStore()` dồn dập trong `session-vault.ts`
- **Hiện tượng & Nguyên nhân**:
  - Trong `src/main/session-vault.ts` (dòng 63), `void ses.cookies.flushStore()` được gọi ngay lập tức ở mỗi sự kiện `cookies.on('changed')`. Khi Zalo/Messenger vừa tải trang, có hàng chục cookie được ghi trong vài trăm ms.
- **Yêu cầu cách sửa**:
  - Bỏ dòng `void ses.cookies.flushStore()` ở dòng 63, vì ngay dòng 64 đã gọi `this.scheduleSnapshot(account, ses)` (có debounce 1500ms) và bên trong `snapshotCookies()` (dòng 107) đã có sẵn `await ses.cookies.flushStore()`.

---

## Phần 2: Đặc Tả Kỹ Thuật Sprint 2 Dành Cho Muse.ai (`SPRINT_2_SPEC`)

Sau khi hoàn tất bản vá **`MUSE-FIX-01`** ở Phần 1, Muse.ai tiếp tục thực hiện **Sprint 2** gồm 2 hạng mục cốt lõi (`MUSE-04` và `MUSE-05`):

### Hạng mục `MUSE-04`: Tích hợp LINE Cá Nhân (`src/main/extension-loader.ts`) & Bộ bắt tin nhắn DOM chuyên sâu (`src/preload/recipes/*`)
1. **`src/main/extension-loader.ts` (LINE Personal Chrome Extension Loader)**:
   - Xây dựng module quản lý nạp Chrome Extension cho dịch vụ `line-personal` (ID chính thức của LINE trên Chrome Web Store: `ophjlpahpchlmihnnnihgmmeilfjmjjc`).
   - Hỗ trợ tìm và nạp extension từ thư mục `path.join(app.getPath('userData'), 'extensions', 'line')` hoặc `resources/extensions/line` bằng `ses.loadExtension(extPath, { allowFileAccess: true })`.
   - Nếu người dùng đã có thư mục extension LINE (hoặc bấm nút "Chọn thư mục Extension LINE / Tải LINE Extension"), tự động nạp và điều hướng `WebContentsView` tới `chrome-extension://${ext.id}/index.html`.
   - Nếu máy chưa có sẵn gói Extension LINE trong thư mục `userData/extensions/line`, hiển thị trang hướng dẫn trực quan ngay trong `WebContentsView` của tab LINE kèm nút bấm/hướng dẫn cài đặt 1 chạm (hoặc tự động tải gói CRX từ Chrome Web Store về giải nén nếu khả thi).
2. **Đọc tin nhắn trực tiếp từ DOM cho các nhóm chat đang mở (`DOM Message Observer`)**:
   - Trong `src/preload/recipes/base-interceptor.ts` (hoặc tách thêm helper), ngoài việc bắt `window.Notification` (vốn đôi khi không nổ nếu người dùng đang focus trực tiếp vào đúng cửa sổ chat đó), hãy bổ sung cơ chế:
     - Cho phép người dùng **bôi đen bất kỳ đoạn tin nhắn nào trong khung chat** và bấm chuột phải (Context Menu của Electron `webContents.on('context-menu')`) $\rightarrow$ Chọn **"🤖 Dịch & Thêm vào Việc cần làm (MultiWork AI)"** hoặc **"📌 Đánh dấu là Chỉ thị của Sếp"**!
     - **Lợi ích kiến trúc cực lớn**: Tính năng Context Menu (`params.selectionText`) hoạt động ở cấp độ Chromium (`webContents.on('context-menu')` trong `view-manager.ts`), nên **hoạt động 100% trên MỌI ứng dụng (Zalo, Messenger, Naver Works, Telegram, LINE, WhatsApp, Slack...)** bất kể cấu trúc DOM của trang web có thay đổi thế nào!

### Hạng mục `MUSE-05`: Tích hợp KakaoTalk Cá Nhân (`src/main/native-dock/*`)
1. Tạo module `src/main/native-dock/kakao-docker.ts` (hỗ trợ cả Windows và macOS):
   - Kiểm tra xem ứng dụng **KakaoTalk Desktop** đã được cài đặt trên máy hay chưa:
     - **Windows**: Kiểm tra các đường dẫn chuẩn (`C:\Program Files (x86)\Kakao\KakaoTalk\KakaoTalk.exe`, `C:\Program Files\Kakao\KakaoTalk\KakaoTalk.exe`, hoặc `%LOCALAPPDATA%\Kakao\KakaoTalk\KakaoTalk.exe`).
     - **macOS**: Kiểm tra `/Applications/KakaoTalk.app`.
   - Cung cấp cơ chế khởi chạy / đưa cửa sổ KakaoTalk khớp vào vùng Viewport của MultiWork (hoặc điều phối cửa sổ qua PowerShell/Win32 trên Windows & AppleScript/`osascript` trên macOS mà không cần phụ thuộc vào C++ addon dễ lỗi build khi cross-compile!).
   - *Lưu ý quan trọng từ Architect*: Để tránh lỗi `node-gyp` khi build đa nền tảng Windows/macOS, Muse.ai **không cần cài thư viện C++ native addon nặng nề**, mà có thể dùng script điều phối cửa sổ nhẹ (PowerShell Win32 C# inline `Add-Type` trên Windows để gọi `SetWindowPos`/`ShowWindow`, và `osascript` trên macOS để đặt bounds cửa sổ `KakaoTalk` khớp khít với `viewportBounds()` của MultiWork!). Đây là giải pháp cực kỳ thông minh, không cần trình biên dịch C++ mà chạy ổn định 100% trên cả Windows và Mac!

---

## Phần 3: Tiêu Chí Nghiệm Thu Sprint 2 (`REV-02`)

1. **`out/preload/sidebar-preload.js` & `out/preload/base-interceptor.js` không còn `require("./chunks/...")`**: Chạy tốt với `sandbox: true`.
2. **Main-World Notification Hook hoạt động**: Bắt được `new window.Notification(title, { body })` phát ra từ Main World.
3. **Context Menu "🤖 Thêm vào Chỉ thị / Việc cần làm"**: Khi bôi đen văn bản trong bất kỳ cửa sổ chat nào và click chuột phải, menu của MultiWork hiện lên cho phép đẩy thẳng đoạn văn bản đó vào `BossDirectiveFeed` & `TodoBoard`.
4. **Lưu trữ bền vững (`JsonStore`)**: `directives`, `todos`, `events` không bị mất khi tắt/mở lại ứng dụng.
5. **Module LINE (`extension-loader.ts`) & KakaoTalk (`kakao-docker.ts`)**: Có đầy đủ code xử lý thực tế và biên dịch `typecheck` + `build` sạch 100%.
