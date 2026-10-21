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

## 📂 Tài liệu nghiên cứu & Điều phối Phát triển (Documentation Index)

Để **Architect (Antigravity)** và **Lead Developer (Muse.ai)** phối hợp phát triển đồng bộ, toàn bộ tài liệu kiến trúc và đặc tả thực thi được tổ chức như sau:

- 🤝 **[Hướng dẫn Phối hợp & Bảng Giao Việc (`docs/AI_COLLABORATION.md`)](./docs/AI_COLLABORATION.md)** *(Đọc đầu tiên)*:
  - Phân công vai trò: **Architect & Reviewer** (xây kiến trúc, kiểm định code) vs **Muse.ai** (thực thi viết code).
  - Bảng theo dõi tiến độ (Task Board) và nhật ký Handoff/Review.
- 📐 **[Đặc tả Kỹ thuật Sprint 1 dành cho Muse.ai (`docs/SPRINT_1_SPEC_FOR_MUSE.md`)](./docs/SPRINT_1_SPEC_FOR_MUSE.md)**:
  - Yêu cầu chi tiết các module cần Muse.ai viết code trong Sprint 1 (`MUSE-01`, `MUSE-02`, `MUSE-03`).
  - Hợp đồng giao tiếp IPC (`IPC Contract`) và 6 tiêu chí nghiệm thu (`Acceptance Criteria`).
- 📋 **[Master Implementation Plan (`docs/PLAN.md`)](./docs/PLAN.md)**:
  - Lựa chọn công nghệ (Electron + BaseWindow/WebContentsView).
  - Kiến trúc quản lý Session không cần đăng nhập lại.
  - Bố cục 3 cột (Sidebar App + Main Chat Viewport + AI To-Do/Schedule Assistant).
  - Lộ trình phát triển theo từng giai đoạn (Phases 1 → 4).
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
