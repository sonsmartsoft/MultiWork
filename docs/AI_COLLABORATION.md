# 🤝 Hướng Dẫn Làm Việc Chung & Phân Công Vai Trò (AI Collaboration Guide)

Dự án: **MultiWork** — https://github.com/sonsmartsoft/MultiWork.git  
File này là **Bảng điều phối trung tâm (Single Source of Truth)** trên GitHub để **Architect/Reviewer** và **Muse.ai (Coder)** phối hợp nhịp nhàng, đúng vai trò.

---

## 1. Phân công Vai trò Chính thức (Theo chỉ định của Product Owner)

| Thành viên AI | Vai trò Chính thức | Phạm vi Trách nhiệm | Quyền truy cập |
|:---|:---|:---|:---|
| **Architect & QA Reviewer** *(Antigravity / Local AI)* | **Kiến trúc sư trưởng & Kiểm định (Architect & Reviewer)** | - Thiết kế kiến trúc, định nghĩa Interface/IPC Contract.<br>- Giao bài toán & tiêu chí nghiệm thu (`docs/SPRINT_*_SPEC_FOR_MUSE.md`).<br>- Pull code của Muse.ai về kiểm tra, chạy thử, review kiến trúc & báo lỗi.<br>- **KHÔNG trực tiếp viết code thực thi.** | Truy cập cả Local (`E:\668.Business Applications\008.Multi Chat`) & GitHub |
| **Muse.ai** | **Kỹ sư Thực thi Chính (Lead Developer / Code Executor)** | - Đọc tài liệu kiến trúc & đặc tả Sprint trên GitHub.<br>- Trực tiếp khởi tạo và viết toàn bộ source code (`package.json`, `src/shared`, `src/main`, `src/preload`, `src/renderer`).<br>- Commit & push code lên GitHub để Architect kiểm tra. | **Chỉ truy cập qua GitHub (`origin/main` hoặc nhánh feature)** |

---

## 2. ⚠️ Quy tắc Vàng khi phối hợp với Muse.ai

1. **Muse KHÔNG thể truy cập thư mục cục bộ trên máy**:
   - Mọi bản vẽ kiến trúc, yêu cầu sửa lỗi (Review Feedback) hoặc cập nhật task **BẮT BUỘC phải được `git commit` và `git push origin main`** thì Muse.ai mới nhìn thấy.
2. **Quy trình làm việc chuẩn 4 bước (Workflow Loop)**:
   - **Bước 1 (Architect)**: Soạn đặc tả kỹ thuật chi tiết cho từng Sprint/Module $\rightarrow$ Cập nhật bảng Tiến độ trong `docs/AI_COLLABORATION.md` $\rightarrow$ Push lên `origin/main`.
   - **Bước 2 (Muse.ai)**: Đọc `docs/AI_COLLABORATION.md` và file Spec tương ứng (VD: `docs/SPRINT_1_SPEC_FOR_MUSE.md`) $\rightarrow$ Viết code thực thi $\rightarrow$ Push lên GitHub.
   - **Bước 3 (Architect)**: `git pull` code của Muse về máy local $\rightarrow$ Kiểm tra kiến trúc, kiểu dữ liệu TypeScript, bảo mật Session, chạy build/test thực tế.
   - **Bước 4 (Nghiệm thu)**: Nếu đạt chuẩn $\rightarrow$ Architect đánh dấu `✅ Passed` và mở Spec cho Sprint tiếp theo. Nếu cần chỉnh sửa $\rightarrow$ Architect ghi rõ vào mục Review Feedback trong file này và push lên cho Muse sửa.

---

## 3. Quy ước Git & Nhánh làm việc

- **Nhánh chính:** `main` (hoặc Muse có thể tạo PR/branch `feat/sprint-1-core` tùy cơ chế hoạt động của Muse, sau đó merge/push để Architect pull về kiểm tra).
- **Commit message chuẩn:**
  - `docs: ...` (Dành cho Architect cập nhật kiến trúc, spec, review report)
  - `feat: ...` / `fix: ...` / `chore: ...` (Dành cho Muse.ai khi viết code thực thi)

---

## 4. Bảng Giao Việc & Theo Dõi Tiến Độ (Task Board & Handoff)

| Mã Task | Hạng mục công việc | Phụ trách | Trạng thái | Tài liệu Đặc tả / Nghiệm thu | Ghi chú |
|:---:|:---|:---:|:---:|:---|:---|
| **ARCH-01** | Lập Master Plan, Phân tích Nền tảng & Kiến trúc AI Work Assistant | **Architect** | ✅ Đã xong | `docs/PLAN.md`<br>`docs/ARCHITECTURE.md`<br>`docs/AI_WORK_ASSISTANT.md` | Đã push tại `c146ebc`, `0a37caf` |
| **ARCH-02** | Thiết lập Quy ước phối hợp & Đặc tả kỹ thuật Sprint 1 cho Muse.ai | **Architect** | ✅ Đã xong | `docs/AI_COLLABORATION.md`<br>`docs/SPRINT_1_SPEC_FOR_MUSE.md` | Sẵn sàng để Muse.ai bắt đầu viết code |
| **MUSE-01** | **[Sprint 1 - Phần A]** Khởi tạo khung dự án (`package.json`, Vite + Electron + React + TS + Tailwind) & `src/shared/types.ts` | **Muse.ai** | 🎯 **Giao cho Muse** | Xem chi tiết trong [`docs/SPRINT_1_SPEC_FOR_MUSE.md`](./SPRINT_1_SPEC_FOR_MUSE.md) | Muse viết code thực thi |
| **MUSE-02** | **[Sprint 1 - Phần B]** Viết Electron Main Process: `BaseWindow`, `ViewManager` (`WebContentsView`), `SessionVault` (Zero Re-login) & `KeepAlive` | **Muse.ai** | 🎯 **Giao cho Muse** | Xem chi tiết trong [`docs/SPRINT_1_SPEC_FOR_MUSE.md`](./SPRINT_1_SPEC_FOR_MUSE.md) | Muse viết code thực thi |
| **MUSE-03** | **[Sprint 1 - Phần C]** Viết Preload (`sidebar-preload.ts`, `base-interceptor.ts`) & Giao diện React 3 cột (`Sidebar`, `RightAssistantPanel`) | **Muse.ai** | 🎯 **Giao cho Muse** | Xem chi tiết trong [`docs/SPRINT_1_SPEC_FOR_MUSE.md`](./SPRINT_1_SPEC_FOR_MUSE.md) | Muse viết code thực thi |
| **REV-01** | Kiểm tra, Review Code & Test thực tế kết quả Sprint 1 của Muse.ai | **Architect** | ⏳ Chờ Muse push | — | Sẽ thực hiện ngay khi Muse hoàn thành `MUSE-01..03` |

---

## 5. Nhật ký Phối hợp & Review (Architecture & QA Log)

### 🏛️ Ghi chú từ Architect gửi Muse.ai (2026-10-21)
- Chào **Muse.ai**! Tôi đóng vai trò **Kiến trúc sư & Kiểm định (Architect & Reviewer)**, còn bạn là **Lead Developer** phụ trách viết toàn bộ source code cho dự án **MultiWork**.
- Tôi đã soạn sẵn bản **Đặc tả Kỹ thuật & Tiêu chí Nghiệm thu chi tiết cho Sprint 1** tại file [`docs/SPRINT_1_SPEC_FOR_MUSE.md`](./SPRINT_1_SPEC_FOR_MUSE.md).
- **Nhiệm vụ hiện tại của Muse.ai**:
  1. Đọc kỹ [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) và [`docs/SPRINT_1_SPEC_FOR_MUSE.md`](./SPRINT_1_SPEC_FOR_MUSE.md).
  2. Triển khai code cho **Sprint 1 (`MUSE-01`, `MUSE-02`, `MUSE-03`)** đúng theo cấu trúc thư mục, IPC channels và TypeScript interfaces đã thống nhất.
  3. Sau khi viết code xong, hãy cập nhật trạng thái vào mục dưới đây và push lên GitHub để tôi pull về kiểm tra và chạy thử.

### 💻 Ghi chú báo cáo từ Muse.ai
- **Trạng thái hiện tại:** *(Muse cập nhật tại đây khi bắt đầu/hoàn thành)*
- **Các file đã tạo/chỉnh sửa:** *(Muse liệt kê tại đây)*
- **Commit / PR cần Architect review:** *(Muse điền mã commit tại đây)*
