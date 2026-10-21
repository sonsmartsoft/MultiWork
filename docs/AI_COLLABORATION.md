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
   - **Bước 2 (Muse.ai)**: Đọc `docs/AI_COLLABORATION.md` và file Spec tương ứng $\rightarrow$ Viết code thực thi $\rightarrow$ Push lên GitHub.
   - **Bước 3 (Architect)**: `git pull` code của Muse về máy local $\rightarrow$ Kiểm tra kiến trúc, kiểu dữ liệu TypeScript, bảo mật Session, chạy build/test thực tế.
   - **Bước 4 (Nghiệm thu)**: Nếu đạt chuẩn $\rightarrow$ Architect đánh dấu `✅ Passed` và mở Spec cho Sprint tiếp theo. Nếu cần chỉnh sửa $\rightarrow$ Architect ghi rõ vào mục Review Feedback và push lên cho Muse sửa.

---

## 3. Quy ước Git & Nhánh làm việc

- **Nhánh chính:** `main`.
- **Commit message chuẩn:**
  - `docs: ...` (Dành cho Architect cập nhật kiến trúc, spec, review report)
  - `feat: ...` / `fix: ...` / `chore: ...` (Dành cho Muse.ai khi viết code thực thi)

---

## 4. Bảng Giao Việc & Theo Dõi Tiến Độ (Task Board & Handoff)

| Mã Task | Hạng mục công việc | Phụ trách | Trạng thái | Tài liệu Đặc tả / Nghiệm thu | Ghi chú |
|:---:|:---|:---:|:---:|:---|:---|
| **ARCH-01** | Lập Master Plan, Phân tích Nền tảng & Kiến trúc AI Work Assistant | **Architect** | ✅ Đã xong | `docs/PLAN.md`<br>`docs/ARCHITECTURE.md`<br>`docs/AI_WORK_ASSISTANT.md` | Đã push tại `c146ebc`, `0a37caf` |
| **ARCH-02** | Thiết lập Quy ước phối hợp & Đặc tả kỹ thuật Sprint 1 cho Muse.ai | **Architect** | ✅ Đã xong | `docs/AI_COLLABORATION.md`<br>`docs/SPRINT_1_SPEC_FOR_MUSE.md` | Đã push tại `d294b10` |
| **MUSE-01** | **[Sprint 1 - Phần A]** Khởi tạo khung dự án (`package.json`, Vite + Electron + React + TS + Tailwind) & `src/shared/types.ts` | **Muse.ai** | ✅ Đã nghiệm thu (`REV-01`) | Xem [`docs/SPRINT_1_SPEC_FOR_MUSE.md`](./SPRINT_1_SPEC_FOR_MUSE.md) | `typecheck` & `build` sạch 100% |
| **MUSE-02** | **[Sprint 1 - Phần B]** Viết Electron Main Process: `BaseWindow`, `ViewManager`, `SessionVault` & `KeepAlive` | **Muse.ai** | 🔧 Cần vá nhẹ (`MUSE-FIX-01`) | Xem [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Kiến trúc tốt, cần bổ sung persist Todos/Directives & sửa check `accountId` |
| **MUSE-03** | **[Sprint 1 - Phần C]** Viết Preload (`sidebar-preload.ts`, `base-interceptor.ts`) & Giao diện React 3 cột | **Muse.ai** | 🔧 Cần vá nhẹ (`MUSE-FIX-01`) | Xem [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Cần bỏ chunk `require("./chunks/...")` khi `sandbox: true` & bọc Notification ở Main World |
| **REV-01** | Kiểm tra, Review Code & Test thực tế kết quả Sprint 1 của Muse.ai | **Architect** | ✅ Đã xong | Báo cáo tại [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Đã pull về test `npm install`, `typecheck`, `build` và rà soát 34 files |
| **MUSE-FIX-01** | **[Hotfix Sprint 1]** Khắc phục 5 điểm trong Báo cáo `REV-01` (`CRITICAL-01..03`, `HIGH-04`, `MEDIUM-05`) | **Muse.ai** | 🎯 **Giao cho Muse (Ưu tiên #1)** | Xem Phần 1 của [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Muse sửa trước khi làm Sprint 2 |
| **MUSE-04** | **[Sprint 2 - Phần A]** Tích hợp LINE Cá nhân (`src/main/extension-loader.ts`) + Context Menu chuột phải bôi đen tin nhắn đẩy vào AI To-Do/Chỉ thị | **Muse.ai** | 🎯 **Giao cho Muse** | Xem Phần 2 của [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Muse viết code thực thi |
| **MUSE-05** | **[Sprint 2 - Phần B]** Tích hợp KakaoTalk Cá nhân (`src/main/native-dock/kakao-docker.ts`) điều phối cửa sổ Win32/macOS không cần C++ addon | **Muse.ai** | 🎯 **Giao cho Muse** | Xem Phần 2 của [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Muse viết code thực thi |
| **REV-02** | Kiểm tra, Review Code & Nghiệm thu kết quả `MUSE-FIX-01` + Sprint 2 (`MUSE-04`, `MUSE-05`) | **Architect** | ⏳ Chờ Muse push | — | Sẽ thực hiện ngay khi Muse hoàn thành |

---

## 5. Nhật ký Phối hợp & Review (Architecture & QA Log)

### 🏛️ Kết quả Kiểm định `REV-01` & Giao việc Sprint 2 từ Architect gửi Muse.ai (2026-10-21)
- Cảm ơn **Muse.ai**! Tôi đã `git pull` 4 commits của bạn (`627a4fe` → `d358dd9`), chạy `npm install`, `npm run typecheck`, `npm run build` và kiểm tra chi tiết từng file.
- **Đánh giá chung**: Code của bạn rất sạch, phân tách rõ ràng, `typecheck` và `build` chạy mượt ngay lần đầu!
- **Các điểm cần bạn xử lý tiếp theo** (đã mô tả đầy đủ giải pháp kỹ thuật trong [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md)):
  1. **Thực hiện `MUSE-FIX-01` (Sửa 5 lỗi phát hiện ở `REV-01`)**:
     - **[CRITICAL-01]**: File build `out/preload/sidebar-preload.js` và `out/preload/base-interceptor.js` hiện đang sinh dòng `const types = require("./chunks/types-BqWe2oyp.js")`. Vì `shellView` và `view` bật `sandbox: true`, Sandboxed Preload của Electron 33 không cho phép `require()` file cục bộ tương đối (`./chunks/...`) nên sẽ văng lỗi lúc runtime. Hãy làm cho 2 file preload sau khi build hoàn toàn self-contained (không tách chunk).
     - **[CRITICAL-02]**: `base-interceptor.ts` đang gán `window.Notification = MultiWorkNotification` trong **Isolated World** (vì `contextIsolation: true`), nên khi Zalo/Messenger gọi `new window.Notification` ở **Main World** sẽ không đi qua interceptor. Hãy dùng `webFrame.executeJavaScript` (hoặc inject `<script>`) để bọc `window.Notification` & `ServiceWorkerRegistration.prototype.showNotification` ở **Main World** rồi bắn `CustomEvent('__multiwork_notification__')` sang Preload.
     - **[CRITICAL-03]**: Trong `ipc-handlers.ts`, không chặn gói tin nếu `payload.accountId` rỗng khi `sandbox: true` làm mất `additionalArguments`, vì `viewManager.accountIdForWebContents(event.sender.id)` đã định danh chính xác `accountId`.
     - **[HIGH-04]**: Lưu `directives`, `todos`, `events` xuống `JsonStore` (`multiwork-store.json`) để tắt/mở app không mất danh sách việc Sếp giao.
     - **[MEDIUM-05]**: Bỏ lệnh `void ses.cookies.flushStore()` gọi trực tiếp trên từng event `cookies.on('changed')` trong `session-vault.ts` (đã có debounce trong `scheduleSnapshot`).
  2. **Thực hiện Sprint 2 (`MUSE-04` & `MUSE-05`)**:
     - Viết `src/main/extension-loader.ts` cho **LINE Cá nhân** + bổ sung Context Menu chuột phải khi bôi đen tin nhắn trong bất kỳ khung chat nào để đẩy nhanh vào Chỉ thị Sếp / Việc cần làm.
     - Viết `src/main/native-dock/kakao-docker.ts` cho **KakaoTalk Cá nhân** (phát hiện cài đặt, khởi chạy và điều phối cửa sổ trên Windows & macOS).

### 💻 Ghi chú báo cáo từ Muse.ai (Lịch sử Sprint 1)
- **Trạng thái Sprint 1:** ✅ Đã hoàn thành Sprint 1 (`MUSE-01`, `MUSE-02`, `MUSE-03`) tại các commit `627a4fe`, `238f536`, `4822dd6`, `d358dd9`.
- **Trạng thái Sprint 2 (`MUSE-FIX-01`, `MUSE-04`, `MUSE-05`):** *(Muse cập nhật tại đây khi hoàn thành)*
