# Kế Hoạch Tổng Thể Phát Triển MultiWork (Master Implementation Plan)

Tài liệu này trình bày kế hoạch chi tiết để xây dựng **MultiWork** — ứng dụng Desktop đa nền tảng (Windows & macOS) hợp nhất tất cả các phần mềm chat phổ biến vào một cửa sổ duy nhất và duy trì trạng thái đăng nhập bền vững (Persistent Login).

---

## 1. Đánh giá & Lựa chọn Công nghệ (Tech Stack Comparison)

Để xây dựng một ứng dụng chứa nhiều phiên làm việc của các nền tảng chat độc lập trên cả **Windows** và **macOS**, có 2 hướng công nghệ chính:

| Tiêu chí | Phương án A: **Electron (Chromium Engine)** ⭐ *(Khuyên dùng)* | Phương án B: **Tauri v2 (OS WebView2 / WKWebView)** |
| :--- | :--- | :--- |
| **Đa nền tảng (Win + Mac)** | Đồng nhất 100% hành vi nhờ dùng chung Chromium Engine trên cả Windows và macOS. | Phụ thuộc WebView2 (Windows) và WKWebView (macOS). WKWebView trên macOS có nhiều giới hạn với Web Push, Service Worker và IndexedDB của Zalo/Telegram. |
| **Cô lập nhiều tài khoản (Multi-Account Isolation)** | Hỗ trợ gốc cực mạnh qua `session.fromPartition('persist:service_id')` — cô lập hoàn toàn Cookie, IndexedDB, LocalStorage, Cache. | Trên macOS (`WKWebsiteDataStore`), việc tách hàng chục persistent data stores độc lập phức tạp và bị giới hạn API. |
| **Hỗ trợ Chrome Extension (Giải quyết bài toán LINE)** | Electron hỗ trợ nạp Chrome Extension (`session.loadExtension`), cho phép chạy trực tiếp **LINE Chrome Extension** ngay trong cửa sổ MultiWork! | **Không hỗ trợ** Chrome Extensions. |
| **Giả lập User-Agent / Bypass chặn trình duyệt** | Can thiệp sâu ở tầng mạng (`webRequest.onBeforeSendHeaders`) và Chromium flags cho từng tab độc lập. | Giới hạn bởi WebView của hệ điều hành. |
| **Mức tiêu thụ RAM** | Khá cao (300MB base + ~100-150MB/tab active), nhưng giải quyết được bằng cơ chế **Tab Hibernation (Auto-unload)**. | Nhẹ hơn ở khung vỏ ban đầu, nhưng khi mở 10 webviews nặng thì lượng RAM tiêu thụ bởi các tiến trình WebView cũng tương đương. |

### ✅ Quyết định kiến trúc đề xuất:
- **Core Runtime**: **Electron (phiên bản mới nhất sử dụng `BaseWindow` + `WebContentsView`)** kết hợp **Node.js**.
  - *Lưu ý*: Không dùng thẻ `<webview>` cũ kỹ của Electron mà dùng **`WebContentsView`** (kiến trúc mới nhất của Electron thay thế `BrowserView`), mang lại hiệu năng tương đương trình duyệt Chrome gốc và bảo mật cao.
- **UI Shell (Sidebar, Workspace Manager, Settings)**: **React 19 + TypeScript + TailwindCSS + Zustand (State Management) + Vite**.
- **Database lưu cấu hình cục bộ**: `better-sqlite3` hoặc `electron-store` (mã hóa bằng `safeStorage` của OS Keychain: DPAPI trên Windows, Keychain trên macOS).

---

## 2. Giải quyết bài toán "Không cần đăng nhập lại nhiều lần" (Zero Re-login Architecture)

Tại sao người dùng thường bị bắt đăng nhập lại trên các trình duyệt hoặc app gom chat thông thường?
1. **Cookie / Token hết hạn do không có tương tác (Idle Session Timeout)**: Zalo, Naver Works, Messenger thường thu hồi phiên nếu không có request gia hạn (`refresh_token` / ping) trong một khoảng thời gian.
2. **Mất dữ liệu IndexedDB / Service Worker khi đóng mở app không đúng cách**: Zalo Web và Telegram Web lưu khóa giải mã và lịch sử tin nhắn trong `IndexedDB`.
3. **Thay đổi Fingerprint / User-Agent khi cập nhật ứng dụng**: Khi Electron nâng cấp phiên bản Chromium, chuỗi `User-Agent` thay đổi khiến server Zalo/Telegram/Messenger tưởng là thiết bị mới và bắt đăng nhập lại.

### Giải pháp 4 lớp của MultiWork:

1. **Persistent Partition Vault (`persist:account_<uuid>`)**:
   - Mỗi tài khoản được gắn một thư mục lưu trữ cố định trong `app.getPath('userData')/Partitions/account_<uuid>`.
   - Toàn bộ `Cookies`, `LocalStorage`, `IndexedDB`, `ServiceWorkers`, `CacheStorage` được ghi xuống đĩa theo thời gian thực.
2. **Frozen User-Agent & Device Fingerprint**:
   - Khi một tài khoản được tạo lần đầu, hệ thống cố định chuỗi `User-Agent` và thông số `sec-ch-ua` (Client Hints) cho phân vùng đó, đảm bảo dù MultiWork có update phiên bản mới thì Zalo/Telegram/Messenger vẫn nhận diện đúng là thiết bị cũ.
3. **Cookie Expiration Extension (Gia hạn Cookie tự động)**:
   - Đối với các session cookie (cookie tự xóa khi đóng trình duyệt), MultiWork lắng nghe sự kiện `session.cookies.on('changed')` để chuyển đổi các session cookie quan trọng thành persistent cookie (nếu nền tảng cho phép) hoặc lưu snapshot cookie trước khi thoát app và khôi phục lại khi mở app.
4. **Background Keep-Alive Heartbeat (Cơ chế giữ phiên ngầm)**:
   - Ngay cả khi một tab đang ở chế độ ngủ (Hibernated) hoặc thu nhỏ, một tiến trình ngầm sẽ định kỳ kích hoạt nhẹ (ping/refresh) mỗi 15–30 phút để server của Zalo, Naver Works, Messenger luôn thấy phiên làm việc còn sống (Active), tránh bị đẩy ra do hết hạn phiên (Session Timeout).

---

## 3. Phân nhóm & Giải pháp kết nối các ứng dụng Chat

Các ứng dụng chat người dùng yêu cầu được chia làm **3 nhóm kỹ thuật** (chi tiết xem tại [`docs/CHAT_PLATFORMS_ANALYSIS.md`](./CHAT_PLATFORMS_ANALYSIS.md)):

### Nhóm 1: Các ứng dụng có Web Client đầy đủ (Tích hợp trực tiếp qua `WebContentsView`)
- **Zalo** (`https://chat.zalo.me`)
- **Facebook Messenger** (`https://www.messenger.com`)
- **Naver Works / LINE WORKS** (`https://talk.worksmobile.com` / `https://auth.worksmobile.com`)
- **Telegram** (`https://web.telegram.org/k/` hoặc `/a/`)
- **WhatsApp**, **Slack**, **Discord**, **Microsoft Teams**, **Viber Web**, **WeChat Web**, **Google Chat**, **Skype**.

### Nhóm 2: Ứng dụng chạy qua Chrome Extension Engine (LINE Cá Nhân)
- **LINE Personal Chat**: Tài khoản cá nhân của LINE sử dụng chính thức **LINE Chrome Extension** (`ophjlpahpchlmihnnnihgmmeilfjmjjc`).
- Nhờ sử dụng Electron (Chromium), MultiWork nạp trực tiếp extension chính thức của LINE vào một `WebContentsView` riêng biệt, chạy mượt trên cả **Windows và macOS** như một tab nội bộ và cho phép Preload script bắt sự kiện tin nhắn mới để dịch tự động.

### Nhóm 3: Ứng dụng đóng chỉ có bản Desktop/Mobile (KakaoTalk Cá Nhân)
- **KakaoTalk Cá Nhân**: Không có phiên bản Web và Kakao kiểm soát rất gắt các giao thức không chính thức (dễ khóa tài khoản cá nhân).
- **Giải pháp chính thức được chọn (An toàn 100% không lo khóa tài khoản)**:
  - **Native Window Docking + OS Notification/UI Automation Reader**:
    - Tận dụng tính năng **Auto-login** sẵn có của **KakaoTalk PC (Windows) & KakaoTalk Mac (macOS)**.
    - **Trên Windows**: Sử dụng Win32 API (`SetParent` / `SetWindowPos`) để nhúng cửa sổ KakaoTalk PC vào thẳng khung hiển thị của MultiWork. Đồng thời dùng **Windows Toast Notification Listener & UI Automation** để đọc nội dung tin nhắn khi Sếp `@tag` hoặc giao việc.
    - **Trên macOS**: Sử dụng Accessibility API (`AXUIElement`) để đồng bộ vị trí/kích thước cửa sổ KakaoTalk Mac khớp liền mạch với vùng khung nhìn của MultiWork và đọc nội dung tin nhắn mới phục vụ AI dịch thuật.

---

## 4. Các tính năng chính của Hệ thống (Key Features)

1. **Bố cục 3 Cột Thông Minh (3-Column Workspace)**:
   - **Cột Trái (Sidebar)**: Danh sách các ứng dụng & tài khoản cá nhân (hỗ trợ đăng nhập nhiều tài khoản Zalo, Telegram, Messenger, Naver Works, LINE, KakaoTalk cùng lúc).
   - **Cột Giữa (Main Chat Viewport)**: Hiển thị cửa sổ chat đang chọn.
   - **Cột Phải (AI Work Co-Pilot Panel)**: Bảng điều khiển trợ lý công việc (Tin nhắn Sếp đã dịch, To-Do List, Calendar/Schedule).
2. **AI Tự Động Dịch & Bắt Chỉ Thị Sếp (Boss & `@Mention` Detector)**:
   - Tự động phát hiện khi nhân viên bị `@tag` (`@Tên`, `@All`) hoặc khi có tin nhắn từ danh sách **Sếp / Quản lý (VIP Watchlist)** trong các nhóm chat.
   - **Tự động dịch đa ngôn ngữ** (Hàn $\leftrightarrow$ Việt, Nhật $\leftrightarrow$ Việt, Anh $\leftrightarrow$ Việt, Trung $\leftrightarrow$ Việt) theo ngữ cảnh công việc.
3. **Tự Động Tạo To-Do List & Đặt Lịch Hẹn (Auto To-Do & Event Scheduler)**:
   - AI tự động bóc tách yêu cầu của Sếp thành các đầu việc cụ thể (**To-Do Item** có hạn chót `Deadline`, mức độ ưu tiên, gắn kèm link nhảy về đúng ứng dụng chat gốc).
   - Tự động nhận diện lịch họp/sự kiện trong tin nhắn để tạo **Event / Schedule**, đặt chuông báo nhắc trước 15–30 phút và đồng bộ với Google/Outlook Calendar (chi tiết tại [`docs/AI_WORK_ASSISTANT.md`](./AI_WORK_ASSISTANT.md)).
4. **Trung tâm Thông báo Hợp nhất & Quản lý RAM (Smart Hibernation)**:
   - Tổng hợp số tin nhắn chưa đọc (Unread Badge) trên Sidebar.
   - Tự động giải phóng RAM khi tab không mở nhưng vẫn giữ luồng bắt thông báo ngầm để AI không bỏ sót tin nhắn của Sếp.
5. **Khóa bảo mật ứng dụng (Master Lock)**:
   - Khóa màn hình MultiWork bằng mật khẩu / Windows Hello / macOS TouchID khi rời máy.

---

## 5. Lộ trình Phát triển (Development Roadmap)

### Giai đoạn 1: Khởi tạo Core, 3-Column UI & Persistent Session (Tuần 1 - 2)
- [ ] Khởi tạo bộ khung dự án: **Electron + Vite + React + TypeScript + TailwindCSS**.
- [ ] Xây dựng `ViewManager` ở Main Process quản lý các `WebContentsView` và `Session Partition`.
- [ ] Thiết kế giao diện 3 cột: Sidebar trái + Khung Chat giữa + Khung AI To-Do/Schedule bên phải.
- [ ] Tích hợp 4 dịch vụ Web cá nhân chuẩn: **Zalo, Messenger, Telegram, Naver Works** với cơ chế **Zero Re-login**.

### Giai đoạn 2: Tích hợp LINE Cá Nhân & Bộ Bắt Tin Nhắn (Message Interceptor) (Tuần 3 - 4)
- [ ] Xây dựng cơ chế **Chromium Extension Loader** trong Electron để tích hợp **LINE Cá Nhân** vào cửa sổ MultiWork.
- [ ] Xây dựng hệ thống **Preload Notification & DOM Observer** cho Zalo, Messenger, Naver Works, Telegram, LINE để bắt thời gian thực mọi tin nhắn có `@tag` hoặc từ Sếp.

### Giai đoạn 3: AI Co-Pilot — Tự Động Dịch, To-Do List & Đặt Lịch (Tuần 5 - 6)
- [ ] Tích hợp **AI Engine (Gemini / OpenAI Structured Output)**: Tự động dịch tin nhắn của Sếp và bóc tách thành JSON (`TodoItem` + `CalendarEvent`).
- [ ] Xây dựng giao diện **To-Do List**, **Calendar/Schedule Timeline**, hệ thống chuông nhắc hẹn (Reminder) và cấu hình **Boss Watchlist** (danh sách Sếp/Từ khóa `@mention`).

### Giai đoạn 4: Tích hợp KakaoTalk Cá Nhân & Đóng gói Win/Mac (Tuần 7 - 8)
- [ ] Triển khai module **Native Window Docker + OS Notification/UI Reader** cho **KakaoTalk Cá Nhân** trên Windows và macOS.
- [ ] Đóng gói bộ cài cho **Windows (`.exe`)** và **macOS (`.dmg`)** qua GitHub Actions CI/CD.
