# Phân Tích Kỹ Thuật Từng Nền Tảng Chat (Chat Platforms Technical Analysis)

Tài liệu này phân tích chi tiết cơ chế hoạt động, xác thực, lưu trữ phiên (Session Persistence) và phương thức tích hợp của từng ứng dụng chat vào **MultiWork** để đội ngũ và **Muse** cùng nghiên cứu.

---

## Tổng quan Ma trận Tích hợp (Integration Matrix)

| Ứng dụng | Phương thức Tích hợp | URL / Cơ chế chính | Nơi lưu Session chính | Độ khó |
| :--- | :--- | :--- | :--- | :---: |
| **Zalo** | `WebContentsView` (Web) | `https://chat.zalo.me` | `Cookies` (`zpw_sek`) + `IndexedDB` + `LocalStorage` | Trung bình |
| **Messenger** | `WebContentsView` (Web) | `https://www.messenger.com` | `Cookies` (`c_user`, `xs`, `datr`) + `IndexedDB` | Dễ |
| **Naver Works** | `WebContentsView` (Web) | `https://talk.worksmobile.com` | `Cookies` (Auth SSO) + `SessionStorage`/`LocalStorage` | Trung bình |
| **Telegram** | `WebContentsView` (Web K/A) | `https://web.telegram.org/a/` | `LocalStorage` (`dc`, `auth_key`) + `IndexedDB` | Dễ |
| **LINE** | `Chrome Extension` trong Electron | Extension ID: `ophjlpahpchlmihnnnihgmmeilfjmjjc` | `chrome.storage.local` + `IndexedDB` trong Partition | Khá cao |
| **KakaoTalk** | `Native Window Bridge` / `Container` | KakaoTalk PC (Win/Mac) hoặc Bridge | Native App Auto-Login Token (Registry/Keychain) | Cao |
| **WhatsApp** | `WebContentsView` (Web) | `https://web.whatsapp.com` | `IndexedDB` (`wawc`) + `ServiceWorker` + `LocalStorage` | Dễ |
| **Slack / Discord / Teams** | `WebContentsView` (Web) | Web App chính thức | `LocalStorage` + `Cookies` + `IndexedDB` | Dễ |

---

## 1. Zalo (`https://chat.zalo.me`)

### Cơ chế hoạt động & Lưu phiên
- Zalo Web sử dụng kết hợp **Cookie HttpOnly (`zpw_sek`)** để xác thực phiên kết nối WebSocket và **IndexedDB (`zalo_db_*`)** để lưu trữ lịch sử tin nhắn cùng khóa mã hóa đầu cuối (E2EE) cục bộ trên trình duyệt.
- **Nguyên nhân hay bị văng phiên (Logout) trên các app thông thường**:
  1. Chuỗi `User-Agent` bị thay đổi khi cập nhật app (Zalo kiểm tra sự trùng khớp giữa `zpw_sek` và `User-Agent` lúc đăng nhập).
  2. Cookie `zpw_sek` hoặc một số cookie phụ bị đánh dấu là `Session Cookie` (mất khi đóng trình duyệt nếu không persist).
  3. Không mở Zalo Web quá lâu hoặc `IndexedDB` bị trình dọn rác xóa.

### Giải pháp trong MultiWork
- Cố định cứng `User-Agent` (Chrome chuẩn trên Windows/macOS) cho mỗi phân vùng `persist:zalo_<id>`.
- Can thiệp qua `session.cookies` để tự động bảo toàn các cookie của domain `.zalo.me` và `chat.zalo.me` (chuyển đổi các session cookie quan trọng sang persistent cookie có hạn 365 ngày hoặc backup/restore qua SQLite).
- Định kỳ gửi heartbeat (giữ kết nối WebSocket hoặc tải lại ngầm) để phiên Zalo Web luôn được tính là "đang sử dụng".

---

## 2. Facebook Messenger (`https://www.messenger.com`)

### Cơ chế hoạt động & Lưu phiên
- Sử dụng bộ Cookie xác thực của Meta: `c_user` (User ID), `xs` (Session Secret), `datr` (Browser Fingerprint), `fr`.
- Kể từ khi Meta bật **Mã hóa đầu cuối (E2EE) mặc định**, lịch sử tin nhắn mới được đồng bộ thông qua mã PIN (Labyrinth Encrypted Backups) và lưu khóa giải mã trong **`IndexedDB`**.

### Giải pháp trong MultiWork
- Giữ nguyên vẹn `IndexedDB` và `LocalStorage` trong thư mục phân vùng độc lập để người dùng chỉ cần nhập mã PIN đồng bộ tin nhắn **đúng 1 lần duy nhất**.
- Cấp quyền `notifications` và `media` (mic/camera) có kiểm soát cho domain `messenger.com`.

---

## 3. Naver Works / LINE WORKS (`https://talk.worksmobile.com`)

### Cơ chế hoạt động & Lưu phiên
- Naver Works (hiện đổi tên thương hiệu quốc tế là **LINE WORKS**) cung cấp giao diện Web Chat đầy đủ tại `https://talk.worksmobile.com` (và cổng đăng nhập `https://auth.worksmobile.com`).
- **Đặc điểm cần lưu ý**:
  - Nhiều công ty cấu hình thời gian sống của phiên Web (Session Timeout) khá ngắn nếu tab không có hoạt động (Idle Timeout).
  - Một số cookie xác thực tại `auth.worksmobile.com` và `.worksmobile.com` được đặt ở chế độ `Session` (không có `expirationDate`), dẫn đến việc tắt cửa sổ là phải đăng nhập lại.

### Giải pháp trong MultiWork
- **Session Cookie Persister**: Khi nhận thấy cookie xác thực từ `.worksmobile.com` được tạo mà không có `expirationDate`, MultiWork sẽ lưu trữ bản sao được mã hóa vào `SessionVault` và tự động nạp lại (`session.cookies.set`) ngay trước khi khởi tạo `WebContentsView` ở lần mở app tiếp theo.
- **Anti-Idle KeepAlive Script**: Inject một đoạn script nhỏ vào `Preload` của Naver Works để gửi tín hiệu hoạt động định kỳ (mỗi 10 phút) giúp phiên làm việc không bị hết hạn do treo máy (Idle).

---

## 4. Telegram (`https://web.telegram.org/a/` hoặc `/k/`)

### Cơ chế hoạt động & Lưu phiên
- Telegram Web (cả bản Web A và Web K) hoạt động trực tiếp qua giao thức **MTProto** trên WebSocket.
- Toàn bộ khóa xác thực (`dc1_auth_key`, `dc2_auth_key`..., `user_auth`) được lưu trong **`LocalStorage`** và dữ liệu cache nằm trong **`IndexedDB`**.
- Một khi đã đăng nhập, khóa `auth_key` của MTProto **không tự hết hạn** trừ khi người dùng chủ động bấm "Terminate Session" trên điện thoại hoặc xóa `LocalStorage`.

### Giải pháp trong MultiWork
- Chỉ cần bảo toàn tuyệt đối `LocalStorage` và `IndexedDB` trong `persist:telegram_<id>`, người dùng sẽ **không bao giờ phải đăng nhập lại**.

---

## 5. LINE (Bài toán đặc thù & Giải pháp)

### Thách thức kỹ thuật
- Khác với Zalo hay Telegram, **LINE không cung cấp trang web chat cá nhân (`web.line.me` không tồn tại)** cho trình duyệt thông thường (chỉ có LINE Official Account Manager `chat.line.biz` cho doanh nghiệp).
- Tuy nhiên, LINE phát hành chính thức **LINE Chrome Extension** (ID: `ophjlpahpchlmihnnnihgmmeilfjmjjc`) chạy trên nền tảng Chromium cho cả Windows, macOS và ChromeOS.

### Giải pháp trong MultiWork
1. **Tích hợp LINE Chrome Extension trực tiếp vào Electron**:
   - Electron hỗ trợ API `session.loadExtension(pathToLineExtension)`.
   - MultiWork sẽ tải và đóng gói sẵn (hoặc tự động tải bản mới nhất từ Chrome Web Store CRX) của LINE Extension vào ứng dụng.
   - Mở trang giao diện của Extension (`chrome-extension://<extension-id>/index.html`) bên trong một `WebContentsView` nằm ngay trong cửa sổ chính của MultiWork!
2. **Duy trì đăng nhập LINE không cần nhập lại**:
   - Bản cập nhật mới của LINE Chrome Extension đã hỗ trợ lưu thông tin xác thực trong `chrome.storage.local` và `IndexedDB`. Kết hợp với cơ chế **Session Snapshot** và tự động điền thông tin/giữ kết nối của MultiWork, người dùng có thể sử dụng LINE ngay trong cùng một cửa sổ trên cả **Windows và macOS**.
3. **Hỗ trợ thêm LINE Official Account (`https://chat.line.biz`)**:
   - Nếu người dùng dùng LINE OA để chăm sóc khách hàng, có thể chọn loại dịch vụ "LINE Business (OA)" chạy trực tiếp qua `WebContentsView`.

---

## 6. KakaoTalk (Bài toán khó nhất & Các phương án giải quyết)

### Thách thức kỹ thuật
- **KakaoTalk không có phiên bản Web** cho tài khoản cá nhân và cũng không còn duy trì Chrome Extension.
- KakaoTalk chỉ có:
  1. **KakaoTalk Desktop Native App** (có mặt trên cả **Windows** và **macOS**, hỗ trợ tính năng **Auto-Login / Tự động đăng nhập** khi khởi động).
  2. **KakaoTalk Mobile App** (Android / iOS).
  3. **Giao thức nội bộ LOCO Protocol** (nhưng Kakao kiểm soát rất chặt các client bên thứ 3 tự viết giao thức LOCO, dễ dẫn đến khóa tài khoản tạm thời nếu gọi trực tiếp không qua app chính thức).

### 3 Phương án Kỹ thuật cho KakaoTalk (Cần thống nhất cùng Muse)

#### Phương án A: Native Window Docking / Embedding (An toàn 100% cho tài khoản, trải nghiệm 1 cửa sổ) ⭐ *(Khuyên dùng)*
- **Cách hoạt động**:
  - Người dùng cài đặt **KakaoTalk PC / Mac** chính thức và bật chế độ **Auto-Login** sẵn có của KakaoTalk (không bao giờ phải đăng nhập lại).
  - Khi người dùng chọn tab **KakaoTalk** trên Sidebar của MultiWork:
    - **Trên Windows**: MultiWork sử dụng Node Native Addon (`ffi-napi` / `koffi` gọi trực tiếp Win32 API `FindWindow`, `SetParent`, `SetWindowLong`, `MoveWindow`) để **nhúng (re-parent) cửa sổ KakaoTalk PC vào thẳng vùng hiển thị bên phải của MultiWork**, ẩn thanh tiêu đề của KakaoTalk đi. Nhìn từ ngoài vào, KakaoTalk nằm gọn bên trong cửa sổ MultiWork y hệt một tab Web!
    - **Trên macOS**: Do macOS Window Server không cho phép `SetParent` xuyên tiến trình (cross-process), MultiWork sử dụng **macOS Accessibility API (`AXUIElement`) & `CGWindowList`** để gắn chặt (dock/overlay) cửa sổ KakaoTalk khớp đúng tọa độ khung nhìn của MultiWork khi tab KakaoTalk được chọn, và tự động ẩn (`NSRunningApplication.hide`) khi chuyển sang tab Zalo/Messenger.
- **Ưu điểm**:
  - **Không bao giờ sợ bị Kakao khóa nick** vì dùng chính app KakaoTalk gốc.
  - Đầy đủ 100% tính năng (Gọi thoại, Video call, gửi file dung lượng lớn, KakaoTalk Emoticons).
  - Tự động đăng nhập hoàn toàn nhờ tính năng Auto-login của KakaoTalk Desktop.

#### Phương án B: Embedded Lightweight Android / Matrix-Kakao Bridge
- Chạy một dịch vụ cầu nối (Bridge) hoặc container ngầm kết nối KakaoTalk và hiển thị giao diện chat chuẩn hóa bên trong MultiWork.
- Phù hợp nếu muốn đồng nhất giao diện Web, nhưng tốn tài nguyên thiết lập ban đầu hơn Phương án A.

#### Phương án C: KakaoTalk Business / Kakao Channel (`https://center-pf.kakao.com`)
- Nếu mục đích sử dụng bao gồm quản trị kênh CSKH KakaoTalk Channel, tích hợp trực tiếp qua `WebContentsView` giống các ứng dụng Web khác.

*(Đề xuất: Kết hợp **Phương án A** cho KakaoTalk cá nhân và **Phương án C** cho KakaoTalk Business).*
