# MultiWork — All-in-One Unified Messaging Workspace (Windows & macOS)

**MultiWork** là ứng dụng Desktop đa nền tảng (**Windows & macOS**) giúp gom tất cả các ứng dụng chat và làm việc phổ biến (**Zalo, Messenger, Naver Works, Telegram, LINE, KakaoTalk, WhatsApp, Slack, Discord, Microsoft Teams...**) vào **một cửa sổ duy nhất** với cơ chế **Persistent Session Vault** — đăng nhập một lần, tự động duy trì phiên làm việc vĩnh viễn mà không cần đăng nhập lại.

---

## 🎯 Mục tiêu cốt lõi (Core Objectives)

1. **Single-Window Unified Experience**: Quản lý hàng chục ứng dụng chat và nhiều tài khoản trên cùng một ứng dụng (VD: 3 tài khoản Zalo, 2 Messenger, 2 Telegram, Naver Works, LINE, KakaoTalk) trong một cửa sổ duy nhất.
2. **Zero Re-login (Persistent Session Isolation)**: Lưu trữ toàn bộ `Cookies`, `LocalStorage`, `IndexedDB`, `Service Workers` và `Encryption Keys` trong các phân vùng độc lập (Isolated Partitions) trên ổ cứng, mã hóa an toàn để khi tắt/mở máy hoặc cập nhật app không bao giờ phải đăng nhập lại hay quét lại mã QR.
3. **Cross-Platform (Windows & macOS)**: Chạy mượt mà trên cả Windows (x64/ARM64) và macOS (Apple Silicon M1/M2/M3/M4 & Intel).
4. **Giải quyết bài toán "App không có bản Web" (KakaoTalk & LINE)**: Kết hợp kiến trúc **Hybrid Web-Container + Native/Bridge Integration** để hỗ trợ cả những nền tảng đóng như KakaoTalk và LINE.
5. **Tối ưu RAM & CPU (Smart Hibernation)**: Tự động đưa các tab không hoạt động vào trạng thái ngủ đông (Auto-Sleep) nhưng vẫn giữ kết nối thông báo ngầm.

---

## 📂 Tài liệu nghiên cứu & Kế hoạch (Documentation Index)

Để đội ngũ phát triển và **Muse** cùng nghiên cứu, toàn bộ kế hoạch kỹ thuật chi tiết được chia thành các tài liệu sau:

- 📋 **[Master Implementation Plan (`docs/PLAN.md`)](./docs/PLAN.md)**:
  - Lựa chọn công nghệ (Electron + BaseWindow/WebContentsView vs Tauri v2).
  - Kiến trúc hệ thống, quản lý Session không cần đăng nhập lại.
  - Quản lý thông báo (Unified Notifications & Unread Badge Counter).
  - Lộ trình phát triển theo từng giai đoạn (Phases 1 → 4).
- 🔍 **[Phân tích kỹ thuật từng nền tảng Chat (`docs/CHAT_PLATFORMS_ANALYSIS.md`)](./docs/CHAT_PLATFORMS_ANALYSIS.md)**:
  - Phân tích chi tiết cơ chế kết nối của **Zalo, Messenger, Naver Works, Telegram, LINE, KakaoTalk** và các nền tảng khác.
  - Giải pháp đặc thù cho **KakaoTalk** và **LINE** (vốn hạn chế trình duyệt Web thông thường).
- 🏗️ **[Kiến trúc kỹ thuật & Bảo mật (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)**:
  - Sơ đồ kiến trúc Process Model, Session Partitioning, Auto-KeepAlive Engine, và cấu trúc thư mục dự án.

---

## 🚀 Trạng thái dự án (Project Status)

- [x] Khởi tạo Repository & Tài liệu nghiên cứu kiến trúc (Planning & Research Phase)
- [ ] Thống nhất giải pháp kỹ thuật cho nhóm Native-only (KakaoTalk / LINE) cùng Muse
- [ ] Khởi tạo Prototype (Phase 1 MVP) với Electron + React + TypeScript
- [ ] Tích hợp Persistent Session Engine & 6 dịch vụ chat đầu tiên
