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

### Nhóm 2: Ứng dụng chạy qua Chrome Extension Engine (LINE)
- **LINE Personal Chat**: LINE không có trang web chat thông thường cho tài khoản cá nhân nhưng phát hành chính thức **LINE Chrome Extension** (`ophjlpahpchlmihnnnihgmmeilfjmjjc`).
- Nhờ sử dụng Electron (Chromium), MultiWork có thể nạp trực tiếp extension chính thức của LINE vào một `WebContentsView` riêng biệt, chạy mượt trên cả **Windows và macOS** như một tab nội bộ.

### Nhóm 3: Ứng dụng đóng chỉ có bản Desktop/Mobile (KakaoTalk)
- **KakaoTalk**: Không có phiên bản Web cho người dùng cá nhân (chỉ có KakaoTalk PC cho Windows/macOS và bản Mobile Android/iOS).
- **3 phương án tích hợp KakaoTalk để nghiên cứu cùng Muse**:
  1. **Phương án 3A (Window Docking / Native Embedder - Khả thi nhất cho bản Desktop)**:
     - Trên Windows: Sử dụng Win32 API (`SetParent` / `SetWindowPos`) để nhúng cửa sổ ứng dụng **KakaoTalk PC** (với tính năng Auto-login bật sẵn của KakaoTalk PC) vào thẳng khung hiển thị của MultiWork.
     - Trên macOS: Sử dụng Accessibility API (`AXUIElement`) để đồng bộ vị trí/kích thước cửa sổ KakaoTalk Mac khớp liền mạch với vùng khung nhìn của MultiWork, hoặc điều khiển ẩn/hiện tức thì khi chuyển tab.
  2. **Phương án 3B (Embedded Android/Waydroid/Scrcpy Bridge hoặc Matrix Bridge)**:
     - Sử dụng giao thức cầu nối hoặc container nhẹ.
  3. **Phương án 3C (LOCO Protocol Unofficial Client / Web Bridge)**:
     - Nghiên cứu thư viện giao thức của KakaoTalk (lưu ý rủi ro chính sách khóa tài khoản của Kakao).

---

## 4. Các tính năng chính của Hệ thống (Key Features)

1. **Sidebar đa tầng (Workspaces & Services)**:
   - Hỗ trợ phân nhóm theo không gian làm việc (VD: *Công việc Hàn Quốc*, *Công việc Việt Nam*, *Cá nhân*).
   - Hỗ trợ đăng nhập **nhiều tài khoản của cùng 1 ứng dụng** (VD: 3 nick Zalo, 2 nick Telegram, 2 nick Messenger chạy song song).
2. **Trung tâm Thông báo Hợp nhất (Unified Notification & Unread Badge)**:
   - Preload Script riêng cho từng dịch vụ (`recipes/zalo/preload.js`, `recipes/messenger/preload.js`...) để đọc số tin nhắn chưa đọc từ DOM / Title và hiển thị chấm đỏ (Badge) tổng hợp trên Sidebar + Icon dưới Taskbar/Dock.
3. **Trình quản lý tài nguyên thông minh (Smart RAM Hibernation)**:
   - Tự động giải phóng bộ nhớ (Hibernate) các ứng dụng không mở sau $X$ phút, nhưng có danh sách loại trừ (Whitelist) hoặc đánh thức định kỳ để không mất kết nối.
4. **Khóa bảo mật ứng dụng (Master Lock)**:
   - Vì mọi ứng dụng chat đều đã đăng nhập sẵn trong MultiWork, cung cấp tính năng khóa màn hình MultiWork bằng mật khẩu / Windows Hello / macOS TouchID khi rời máy.
5. **Sao lưu & Đồng bộ Phiên (Session Backup / Export)**:
   - Cho phép xuất (Export) cấu hình các tài khoản đã đăng nhập (mã hóa AES-256) để backup.

---

## 5. Lộ trình Phát triển (Development Roadmap)

### Giai đoạn 1: Khởi tạo Core & MVP (Tuần 1 - 2)
- [ ] Khởi tạo bộ khung dự án: **Electron + Vite + React + TypeScript + TailwindCSS**.
- [ ] Xây dựng `ViewManager` ở Main Process quản lý các `WebContentsView` và `Session Partition`.
- [ ] Thiết kế giao diện Sidebar (thêm/xóa/chuyển đổi dịch vụ, hỗ trợ đa tài khoản cho cùng 1 dịch vụ).
- [ ] Tích hợp thành công 4 dịch vụ Web chuẩn: **Zalo, Messenger, Telegram, Naver Works**.
- [ ] Triển khai cơ chế **Persistent Session Vault** (Cố định User-Agent, lưu trữ Partition, giữ phiên không bị đăng xuất khi tắt/mở app).

### Giai đoạn 2: Tích hợp LINE & Hệ thống Recipe/Preload (Tuần 3 - 4)
- [ ] Xây dựng cơ chế **Chromium Extension Loader** trong Electron để tích hợp **LINE** vào cửa sổ MultiWork.
- [ ] Xây dựng hệ thống **Service Recipes** (Preload scripts thu thập số tin nhắn chưa đọc, chặn quảng cáo/popup thừa, inject Dark Mode đồng bộ).
- [ ] Triển khai **Keep-Alive Heartbeat Engine** chống tự động đăng xuất khi treo máy lâu.

### Giai đoạn 3: Tích hợp KakaoTalk & Tối ưu Đa nền tảng Win/Mac (Tuần 5 - 6)
- [ ] Triển khai module **Native App Bridge / Window Docker** cho **KakaoTalk** trên Windows (Win32 API) và macOS (Accessibility/Window Coordinator).
- [ ] Tối ưu hóa bộ nhớ (Auto-Hibernation), phím tắt chuyển nhanh (`Ctrl/Cmd + 1..9`, `Ctrl/Cmd + K` tìm kiếm nhanh).
- [ ] Thêm tính năng **Master Lock** (Mật khẩu / TouchID / Windows Hello).

### Giai đoạn 4: Đóng gói, Tự động cập nhật & Phát hành (Tuần 7)
- [ ] Cấu hình `electron-builder` đóng gói bộ cài cho **Windows (`.exe` NSIS)** và **macOS (`.dmg` Universal/Apple Silicon + Intel)**.
- [ ] Thiết lập GitHub Actions CI/CD tự động build cả bản Windows và macOS khi push tag lên repository `MultiWork`.
