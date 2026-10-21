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
| **MUSE-01** | **[Sprint 1 - Phần A]** Khởi tạo khung dự án (`package.json`, Vite + Electron + React + TS + Tailwind) & `src/shared/types.ts` | **Muse.ai** | ✅ Đã xong — chờ REV-01 | Xem chi tiết trong [`docs/SPRINT_1_SPEC_FOR_MUSE.md`](./SPRINT_1_SPEC_FOR_MUSE.md) | Muse viết code thực thi |
| **MUSE-02** | **[Sprint 1 - Phần B]** Viết Electron Main Process: `BaseWindow`, `ViewManager` (`WebContentsView`), `SessionVault` (Zero Re-login) & `KeepAlive` | **Muse.ai** | ✅ Đã xong — chờ REV-01 | Xem chi tiết trong [`docs/SPRINT_1_SPEC_FOR_MUSE.md`](./SPRINT_1_SPEC_FOR_MUSE.md) | Muse viết code thực thi |
| **MUSE-03** | **[Sprint 1 - Phần C]** Viết Preload (`sidebar-preload.ts`, `base-interceptor.ts`) & Giao diện React 3 cột (`Sidebar`, `RightAssistantPanel`) | **Muse.ai** | ✅ Đã xong — chờ REV-01 | Xem chi tiết trong [`docs/SPRINT_1_SPEC_FOR_MUSE.md`](./SPRINT_1_SPEC_FOR_MUSE.md) | Muse viết code thực thi |
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
- **Trạng thái hiện tại:** ✅ Đã hoàn thành Sprint 1 (MUSE-01, MUSE-02, MUSE-03) — code đã commit ở local, chờ Product Owner cấp quyền push cho repo MultiWork (token GitHub hiện tại của Muse chỉ có quyền ở repo AI-Studio nên GitHub trả 404 khi truy cập MultiWork). Ngay khi có quyền, Muse push 4 commit dưới đây lên `main` để Architect pull về chạy REV-01.
- **Các file đã tạo/chỉnh sửa:**
  - `MUSE-01`: `package.json`, `package-lock.json`, `tsconfig.json` / `tsconfig.node.json` / `tsconfig.preload.json`, `electron.vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `electron-builder.yml`, `src/shared/types.ts` (toàn bộ domain types + `SERVICE_CATALOG` + `IPC_CHANNELS` đúng Spec §2 + `LAYOUT` constants + interface `MultiWorkAPI`).
  - `MUSE-02`: `src/main/index.ts` (BaseWindow + shell WebContentsView + vòng đời app), `src/main/view-manager.ts` (Map WebContentsView theo account, công thức bounds đúng Spec, stub LINE/Kakao), `src/main/session-vault.ts` (partition `persist:acc_<id>`, frozen UA đã loại `Electron/...` cả ở webContents lẫn webRequest, cookie persister: session cookie → persistent 365 ngày + `flushStore` khi changed + snapshot mã hóa `safeStorage` và khôi phục khi mở app), `src/main/keep-alive.ts` (tick 60s, ping theo chu kỳ riêng từng tài khoản, mặc định 15 phút), `src/main/boss-filter.ts` (lọc @mention/Sếp theo `BossWatchRule`, heuristic tạo To-Do — phần dịch AI để Sprint 3), `src/main/ipc-handlers.ts` (đủ kênh IPC của Spec §2, xác thực sender → account), `src/main/store.ts` (JSON store trong userData, ghi atomic).
  - `MUSE-03`: `src/preload/sidebar-preload.ts` (`contextBridge` expose `multiworkAPI`), `src/preload/recipes/base-interceptor.ts` (unread từ `document.title` + MutationObserver, wrap `window.Notification` và `ServiceWorkerRegistration.showNotification`, account id qua `additionalArguments`), `src/renderer/*` (App 3 cột + TopBar 44px, `Sidebar`, `AddServiceModal`, `RightAssistantPanel` + `BossDirectiveFeed` / `TodoBoard` / `ScheduleCalendar`, `BossWatchlistModal`, 2 Zustand stores).
- **Kết quả tự kiểm chứng (trước khi push):**
  - `npm install` ✅ (204 packages) • `npm run typecheck` ✅ sạch cả 3 project (renderer/main/preload) • `npm run build` ✅ ra đủ `out/main`, `out/preload` (2 entry), `out/renderer`.
  - Smoke test: chạy Electron trên Xvfb — app khởi động, mở cửa sổ, chạy ổn định, không lỗi JS ở Main/Renderer.
  - Đối chiếu Acceptance Criteria: (1) ✅ build/typecheck sạch; (2) ✅ khi mở Modal, Renderer gọi kênh mở rộng `layout:set-chat-visible` để Main ẩn chat view; (3) ✅ mỗi account một `persist:acc_<id>` riêng, thêm được nhiều account cùng dịch vụ; (4) ✅ UA không chứa `Electron/`, `flushStore` khi cookie changed + trong `before-quit`; (5) ✅ interceptor bắt Notification + title; (6) ✅ mọi chat view đều `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
- **Quyết định kỹ thuật cần Architect lưu ý:**
  1. Bổ sung 2 kênh IPC ngoài Spec §2 (đã ghi rõ `[extension]` trong `src/shared/types.ts`): `layout:set-sidebar-width` (Sidebar có 2 trạng thái 68/240px theo Spec §MUSE-02.1) và `layout:set-chat-visible` (bắt buộc để đạt Acceptance #2 — Modal không bị WebContentsView che). Thêm `assistant:get-boss-rule` / `assistant:set-boss-rule` để Main-process filter dùng chung watchlist với UI.
  2. Lưu trữ cấu hình bằng JSON store tự viết (atomic write) thay cho `electron-store` để tránh phụ thuộc native/ESM; snapshot cookie vẫn mã hóa `safeStorage` đúng Spec.
  3. `BossDirective.translatedBody` ở Sprint 1 = nguyên văn tin nhắn gốc; bản dịch AI + trích xuất Event sẽ thay ở Sprint 3 đúng thiết kế `AI_WORK_ASSISTANT.md`.
- **Commit / PR cần Architect review:** `699bec0` (MUSE-01), `169ef3a` (MUSE-02), `a2e21d2` (MUSE-03) + commit `docs:` chứa báo cáo này — tất cả đang ở local của Muse, sẵn sàng push ngay khi được cấp quyền repo MultiWork.
