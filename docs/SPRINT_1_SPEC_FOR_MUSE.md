# 📐 Đặc Tả Kỹ Thuật Sprint 1 Dành Cho Muse.ai (`SPRINT_1_SPEC_FOR_MUSE.md`)

> **Người lập thiết kế (Architect & Reviewer):** Antigravity  
> **Đơn vị thực thi code (Lead Developer):** Muse.ai  
> **Mục tiêu Sprint 1:** Xây dựng bộ khung lõi (Core MVP) chạy được trên cả **Windows & macOS**, hỗ trợ bố cục 3 cột, quản lý nhiều tài khoản cá nhân trên các phân vùng độc lập (`WebContentsView` + `persist:acc_<uuid>`), cơ chế **Zero Re-login (`SessionVault` + `KeepAlive`)**, và khung giao diện **AI Work Assistant Panel** bên phải.

---

## 1. Phạm vi Công việc Của Muse.ai Trong Sprint 1

Muse.ai chịu trách nhiệm viết code hoàn chỉnh cho 3 hạng mục (`MUSE-01`, `MUSE-02`, `MUSE-03`):

### Hạng mục `MUSE-01`: Khởi tạo Dự án & Shared Contracts (`src/shared/types.ts`)
1. Tạo `package.json`, `tsconfig.json`, `vite.config.ts` (hoặc `electron.vite.config.ts`), cấu hình TailwindCSS để chạy mượt lệnh `npm run dev` và `npm run build`.
2. Tạo file `src/shared/types.ts` chứa đầy đủ các kiểu dữ liệu chuẩn và danh sách **IPC Channels** cố định để Main Process, Preload và React Renderer dùng chung.

### Hạng mục `MUSE-02`: Xây dựng Electron Main Process (`src/main/*`)
1. **`src/main/index.ts`**:
   - Khởi tạo cửa sổ chính bằng `BaseWindow` (hoặc `BrowserWindow` đóng vai trò Shell chứa UI React và gắn các `WebContentsView` con cho từng ứng dụng chat).
   - Tính toán vùng hiển thị (Viewport Bounds) tự động co giãn khi người dùng thay đổi kích thước cửa sổ hoặc đóng/mở bảng **Right AI Assistant Panel**:
     - Cột Trái (`Sidebar`): rộng `68px` (hoặc `240px` khi mở rộng).
     - Cột Phải (`RightAssistantPanel`): rộng `360px` khi mở (`isAssistantOpen = true`), `0px` khi thu gọn.
     - Cột Giữa (`Active Chat WebContentsView`): Chiếm toàn bộ diện tích ở giữa (`x = sidebarWidth`, `y = topBarHeight`, `width = windowWidth - sidebarWidth - rightPanelWidth`, `height = windowHeight - topBarHeight`).
2. **`src/main/session-vault.ts` (Zero Re-login Engine)**:
   - Mỗi tài khoản `AccountInstance` dùng phân vùng `session.fromPartition('persist:acc_' + account.id)`.
   - **Cố định `User-Agent`**: Lưu một chuỗi Chrome User-Agent chuẩn theo hệ điều hành (`Windows` hoặc `macOS`) vào cấu hình tài khoản ngay lúc tạo mới, và áp dụng cố định cho `webContents.setUserAgent(account.frozenUserAgent)` + xóa dấu vết `Electron/...` trong User-Agent để Zalo, Messenger, Naver Works, Telegram không chặn hoặc bắt đăng nhập lại.
   - **Cookie Persister**: Lắng nghe sự kiện `ses.cookies.on('changed')` hoặc định kỳ `ses.cookies.flushStore()`. Đối với các cookie xác thực quan trọng bị đặt dưới dạng Session Cookie (không có `expirationDate`, thường gặp ở Naver Works và Zalo), tự động gia hạn hoặc sao lưu mã hóa qua `safeStorage` để khôi phục khi mở lại app.
3. **`src/main/view-manager.ts`**:
   - Quản lý Map các `WebContentsView` theo `account.id`.
   - Hỗ trợ sẵn URL chuẩn cho các nền tảng tài khoản cá nhân:
     - `zalo`: `https://chat.zalo.me`
     - `messenger`: `https://www.messenger.com`
     - `naver-works`: `https://talk.worksmobile.com`
     - `telegram`: `https://web.telegram.org/a/`
     - `whatsapp`: `https://web.whatsapp.com`
     - `line-personal` / `kakaotalk-personal`: Tạo sẵn bộ khung điều hướng (stub/placeholder trong Sprint 1, sẽ nối với Extension Loader và Native Window Docker ở Sprint 2).
4. **`src/main/keep-alive.ts`**:
   - Tiến trình định kỳ (mặc định mỗi 15 phút) kiểm tra các `WebContentsView` đã đăng nhập để giữ kết nối ngầm, chống Idle Session Timeout.
5. **`src/main/ipc-handlers.ts`**:
   - Đăng ký đầy đủ các kênh IPC giao tiếp với Sidebar, Right Assistant Panel và Preload Interceptor.

### Hạng mục `MUSE-03`: Preload Scripts & Giao diện 3 Cột (`src/preload/*` & `src/renderer/*`)
1. **`src/preload/sidebar-preload.ts`**:
   - Dùng `contextBridge.exposeInMainWorld('multiworkAPI', ...)` để cung cấp API an toàn cho giao diện React (thêm/xóa/chuyển tài khoản, đóng/mở cột AI Assistant, nhận danh sách tin nhắn Sếp/To-Do/Schedule).
2. **`src/preload/recipes/base-interceptor.ts`**:
   - Inject vào các `WebContentsView` của ứng dụng chat để:
     - Đếm số tin nhắn chưa đọc từ `document.title` (VD: `(3) Zalo` $\rightarrow$ `unreadCount = 3`) và gửi về Main Process qua IPC.
     - Bọc (wrap) `window.Notification` để mỗi khi có thông báo tin nhắn mới (tên người gửi/nhóm + nội dung tin nhắn), tự động gửi sự kiện `chat:incoming-notification` về Main Process để bộ lọc **Boss & `@Mention` Detector** xử lý.
3. **`src/renderer/*` (React + Tailwind + Zustand)**:
   - **`Sidebar.tsx` (Cột trái)**: Hiển thị danh sách các tài khoản chat cá nhân kèm chấm đỏ `unreadCount`, nút `+` để thêm tài khoản mới (cho phép thêm nhiều tài khoản của cùng 1 dịch vụ, VD: 2 Zalo, 2 Telegram, Naver Works...).
   - **`RightAssistantPanel.tsx` (Cột phải)**: Giao diện bảng Trợ lý AI gồm 3 tab:
     1. **🔔 Chỉ thị Sếp & `@Tag` (`BossDirectiveFeed.tsx`)**: Hiển thị các tin nhắn bắt được có `@mention` hoặc từ Sếp kèm bản dịch.
     2. **✅ Việc cần làm (`TodoBoard.tsx`)**: Danh sách To-Do trích xuất từ tin nhắn Sếp (hỗ trợ thêm/hoàn thành/nhảy về app chat gốc).
     3. **📅 Lịch trình (`ScheduleCalendar.tsx`)**: Danh sách Event & Schedule kèm nhắc hẹn.
   - **`BossWatchlistModal.tsx`**: Cài đặt từ khóa `@mention` của nhân viên (VD: `@Son`, `@Sơn`, `손님`) và danh sách tên Sếp (`Boss Watchlist`).

---

## 2. Hợp Đồng Giao Tiếp IPC Chuẩn (`IPC Contract`)

Muse.ai vui lòng sử dụng đúng tên các kênh IPC dưới đây để đảm bảo tính đồng bộ khi kiểm định:

| Kênh IPC (`Channel Name`) | Chiều gọi | Tham số truyền vào (`Payload`) | Kết quả trả về |
|:---|:---|:---|:---|
| `accounts:list` | Renderer $\rightarrow$ Main (`invoke`) | `void` | `AccountInstance[]` |
| `accounts:add` | Renderer $\rightarrow$ Main (`invoke`) | `{ serviceType, displayName, customUrl? }` | `AccountInstance` |
| `accounts:switch` | Renderer $\rightarrow$ Main (`invoke`) | `{ accountId: string }` | `void` |
| `accounts:remove` | Renderer $\rightarrow$ Main (`invoke`) | `{ accountId: string }` | `boolean` |
| `layout:set-assistant-panel` | Renderer $\rightarrow$ Main (`invoke`) | `{ isOpen: boolean, width: number }` | `void` *(Main tự resize `WebContentsView`)* |
| `chat:unread-updated` | Preload $\leftrightarrow$ Main $\rightarrow$ Renderer | `{ accountId: string, unreadCount: number }` | Sự kiện cập nhật Badge |
| `chat:incoming-notification` | Chat Preload $\rightarrow$ Main | `{ accountId, title, body, timestamp }` | Main lọc Boss/`@tag` $\rightarrow$ đẩy sang AI Assistant |
| `assistant:new-directive` | Main $\rightarrow$ Renderer (`send`) | `{ directive, todo?, event? }` | Cập nhật UI cột phải theo thời gian thực |

---

## 3. Tiêu Chí Nghiệm Thu (`Acceptance Criteria` - Dùng để Architect kiểm tra)

Khi Muse.ai push code lên GitHub, **Architect (Antigravity)** sẽ pull về và kiểm tra theo 6 tiêu chí sau:

1. **Build & Type-check sạch**: Chạy `npm install` và `npm run typecheck` / `npm run build` không phát sinh lỗi TypeScript hay thiếu thư viện.
2. **Bố cục `WebContentsView` không đè lên UI**: Khi mở `AddServiceModal` hoặc mở cột phải `RightAssistantPanel`, vùng `WebContentsView` của ứng dụng chat được co giãn/ẩn hợp lý để không che khuất Modal hay bảng AI Assistant.
3. **Cô lập Phiên & Đa tài khoản**: Có thể thêm 2 tài khoản Zalo hoặc 2 tài khoản Telegram khác nhau, mỗi tài khoản có `partitionName: "persist:acc_<id>"` riêng biệt, không bị dùng chung Cookie.
4. **Zero Re-login**: User-Agent đã loại bỏ chuỗi `Electron/...`, `session.cookies.flushStore()` được gọi đầy đủ khi có thay đổi cookie và trước khi đóng app (`before-quit`).
5. **Bắt được Notification & Unread Badge**: `base-interceptor.ts` bắt được sự kiện `window.Notification` và thay đổi `document.title` để gửi về Main Process.
6. **Bảo mật**: Mọi `WebContentsView` của trang chat bên ngoài đều bật `contextIsolation: true` và không lộ `nodeIntegration`.
