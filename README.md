# MultiWork — All-in-One Unified Messaging Workspace (Windows & macOS)

**MultiWork** là ứng dụng Desktop đa nền tảng (**Windows & macOS**) giúp gom tất cả các ứng dụng chat và làm việc phổ biến (**Zalo, Messenger, Naver Works, Telegram, LINE, KakaoTalk, WhatsApp, Slack, Discord, Microsoft Teams...**) vào **một cửa sổ duy nhất** với cơ chế **Persistent Session Vault** — đăng nhập một lần, tự động duy trì phiên làm việc vĩnh viễn mà không cần đăng nhập lại.

---

## 🎯 Mục tiêu cốt lõi (Core Objectives)

1. **Single-Window Unified Experience (Tài khoản Cá nhân)**: Quản lý hàng chục ứng dụng chat cá nhân trên cùng một ứng dụng (VD: nhiều tài khoản Zalo, Messenger, Telegram, Naver Works, LINE cá nhân, KakaoTalk cá nhân) trong một cửa sổ duy nhất.
2. **Zero Re-login (Persistent Session Isolation)**: Lưu trữ toàn bộ `Cookies`, `LocalStorage`, `IndexedDB`, `Service Workers` và `Encryption Keys` trong các phân vùng độc lập (Isolated Partitions) trên ổ cứng, mã hóa an toàn để khi tắt/mở máy hoặc cập nhật app không bao giờ phải đăng nhập lại hay quét lại mã QR.
3. **AI Work Co-Pilot (Tự động Dịch chỉ thị Sếp $\rightarrow$ To-Do List & Lịch trình)**:
   - Tự động phát hiện khi **Sếp / Quản lý `@tag` nhân viên** hoặc giao việc trong các nhóm chat (KakaoTalk, LINE, Naver Works, Zalo, Telegram, Messenger).
   - **Tự động dịch đa ngôn ngữ** (Hàn / Nhật / Anh / Trung $\leftrightarrow$ Việt) chuẩn văn phong công sở.
   - **Tự động bóc tách đầu việc vào To-Do List** và **đặt lịch hẹn / nhắc việc (Event & Schedule)** ngay trên thanh công cụ bên phải (Right Assistant Panel).
4. **Cross-Platform (Windows & macOS)**: Chạy mượt mà trên cả Windows (x64/ARM64) và macOS (Apple Silicon M1/M2/M3/M4 & Intel).
5. **Giải quyết bài toán "App Cá nhân không có bản Web" (KakaoTalk & LINE)**: Kết hợp **Chromium Extension Engine** (cho LINE cá nhân) + **Native Window Docking & OS Notification Reader** (cho KakaoTalk cá nhân) để an toàn 100% không bao giờ bị khóa tài khoản.

---

## 📂 Tài liệu nghiên cứu & Kế hoạch (Documentation Index)

Để đội ngũ phát triển và **Muse** cùng nghiên cứu, toàn bộ kế hoạch kỹ thuật chi tiết được chia thành các tài liệu sau:

- 📋 **[Master Implementation Plan (`docs/PLAN.md`)](./docs/PLAN.md)**:
  - Lựa chọn công nghệ (Electron + BaseWindow/WebContentsView).
  - Kiến trúc quản lý Session không cần đăng nhập lại.
  - Bố cục 3 cột (Sidebar App + Main Chat Viewport + AI To-Do/Schedule Assistant).
  - Lộ trình phát triển theo từng giai đoạn (Phases 1 → 5).
- 🤖 **[Thiết kế Phân hệ AI Trợ Lý Công Việc (`docs/AI_WORK_ASSISTANT.md`)](./docs/AI_WORK_ASSISTANT.md)**:
  - Cơ chế bắt tin nhắn `@tag` / chỉ thị của Sếp an toàn 100% cho tài khoản cá nhân.
  - Luồng AI tự động dịch thuật, bóc tách `To-Do List`, tạo `Event / Schedule` và nhắc việc thông minh.
- 🔍 **[Phân tích kỹ thuật từng nền tảng Chat (`docs/CHAT_PLATFORMS_ANALYSIS.md`)](./docs/CHAT_PLATFORMS_ANALYSIS.md)**:
  - Phân tích chi tiết cơ chế kết nối tài khoản cá nhân của **Zalo, Messenger, Naver Works, Telegram, LINE, KakaoTalk**.
  - Giải pháp đọc tin nhắn & giữ phiên cho từng nền tảng.
- 🏗️ **[Kiến trúc kỹ thuật & Bảo mật (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)**:
  - Sơ đồ kiến trúc Process Model, Session Partitioning, AI Interceptor Pipeline, và cấu trúc thư mục dự án.

---

## 🚀 Trạng thái dự án (Project Status)

- [x] Khởi tạo Repository & Tài liệu nghiên cứu kiến trúc (Planning & Research Phase)
- [x] Bổ sung thiết kế chuyên sâu cho Tài khoản Cá nhân + AI Tự động Dịch / Tạo To-Do / Đặt Lịch trình khi Sếp `@tag`
- [ ] Khởi tạo Prototype (Phase 1 MVP) với Electron + React + TypeScript
- [ ] Tích hợp Persistent Session Engine & AI Work Assistant Panel
