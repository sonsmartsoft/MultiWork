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
   - **Bước 4 (Nghiệm thu)**: Nếu đạt chuẩn $\rightarrow$ Architect đánh dấu `✅ Passed` và mở Spec cho Sprint tiếp theo.

---

## 3. Bảng Giao Việc & Theo Dõi Tiến Độ (Task Board & Handoff)

| Mã Task | Hạng mục công việc | Phụ trách | Trạng thái | Tài liệu Đặc tả / Nghiệm thu | Ghi chú |
|:---:|:---|:---:|:---:|:---|:---|
| **ARCH-01..02** | Master Plan, Kiến trúc & Đặc tả Sprint 1–2 | **Architect** | ✅ Đã xong | `docs/PLAN.md`, `docs/ARCHITECTURE.md` | Đã push |
| **MUSE-01..03** | **[Sprint 1]** Khung dự án, Electron Main, Preload & React UI 3 cột | **Muse.ai** | ✅ Đã nghiệm thu (`REV-02`) | [`docs/SPRINT_1_SPEC_FOR_MUSE.md`](./SPRINT_1_SPEC_FOR_MUSE.md) | Pass 100% |
| **MUSE-FIX-01** | **[Hotfix Sprint 1]** Khắc phục 5 điểm trong Báo cáo `REV-01` | **Muse.ai** | ✅ Đã nghiệm thu (`REV-02`) | [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Preload self-contained, Main-World Notification, Durable Store |
| **MUSE-04** | **[Sprint 2 - Phần A]** Tích hợp LINE Cá nhân (`extension-loader.ts`) + Context Menu chuột phải bôi đen tin nhắn | **Muse.ai** | ✅ Đã nghiệm thu (`REV-02`) | [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Pass 100% |
| **MUSE-05** | **[Sprint 2 - Phần B]** Tích hợp KakaoTalk Cá nhân (`kakao-docker.ts`) + Windows Registry Probe + WeChat | **Muse.ai** | ✅ Đã nghiệm thu (`REV-02`) | [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Pass 100% |
| **REV-02** | Kiểm tra, Review Code & Nghiệm thu kết quả `MUSE-FIX-01` + Sprint 2 (`MUSE-04`, `MUSE-05`) | **Architect** | ✅ Đã xong | Báo cáo tại [`docs/SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md`](./SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md) | Tất cả 5 bản vá và 2 module Sprint 2 đạt chuẩn 100% |
| **MUSE-06** | **[Sprint 3 - Phần A]** Bộ Dịch thuật Đa ngôn ngữ (Free Google Translate + Optional LLM Gemini/OpenAI) & Bóc tách Thời gian/Lịch hẹn tự động (`src/main/ai-assistant/ai-translator-agent.ts`) | **Muse.ai** | 🎯 **Giao cho Muse (Ưu tiên #1)** | Xem chi tiết trong [`docs/SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md`](./SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md) | Thay thế phần giữ chỗ `// Sprint 3: AI translation` |
| **MUSE-07** | **[Sprint 3 - Phần B]** Hệ thống Chuông Nhắc Việc (`scheduler-alarm.ts`) & Hoàn thiện UI Lịch trình (`ScheduleCalendar.tsx` thêm/xóa sự kiện, mở nhanh Google Calendar) | **Muse.ai** | 🎯 **Giao cho Muse** | Xem chi tiết trong [`docs/SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md`](./SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md) | Muse viết code thực thi |
| **MUSE-08** | **[Sprint 3 - Phần C]** Đồng bộ tự động vòng đời cửa sổ KakaoTalk (Auto-Follow khi kéo/resize MultiWork & Auto-Hide khi chuyển sang tab Zalo/Messenger) | **Muse.ai** | 🎯 **Giao cho Muse** | Xem chi tiết trong [`docs/SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md`](./SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md) | Muse viết code thực thi |
| **REV-03** | Nghiệm thu Sprint 3 (`MUSE-06`, `MUSE-07`, `MUSE-08`) | **Architect** | ⏳ Chờ Muse push | — | Sẽ thực hiện ngay khi Muse hoàn thành |

---

## 4. Nhật ký Phối hợp & Review (Architecture & QA Log)

### 🏛️ Kết quả Nghiệm thu `REV-02` & Giao việc Sprint 3 từ Architect gửi Muse.ai (2026-10-21)
- **Xuất sắc, Muse.ai!** Tôi đã `git pull` toàn bộ các commit từ `27cf0ef` đến `b474735`, chạy `npm run typecheck` và `npm run build`.
- **Kết quả kiểm định `REV-02`**:
  - Cả 5 điểm của `MUSE-FIX-01` đều đã được giải quyết triệt để (`out/preload/sidebar-preload.js` và `out/preload/base-interceptor.js` hoàn toàn độc lập không còn `chunks/`, Main-World Notification hook chuẩn xác, `AssistantService` lưu bền vững xuống `multiwork-store.json`).
  - `MUSE-04` (LINE Extension Loader + Context Menu bôi đen văn bản) và `MUSE-05` (KakaoTalk Native Docker kèm quét Windows Registry + bổ sung WeChat + nút mở cài đặt Sếp trên bảng Assistant) đều đạt chất lượng rất cao.
- **Nhiệm vụ tiếp theo của Muse.ai — Sprint 3 (`MUSE-06`, `MUSE-07`, `MUSE-08`)**:
  - Tôi đã xuất bản bản đặc tả chi tiết cho Sprint 3 tại [`docs/SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md`](./SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md).
  - Trọng tâm của Sprint 3 là hoàn thiện phần đang để comment `// Sprint 3: replaced by the AI translation` trong `boss-filter.ts` / `assistant-service.ts` và `ScheduleCalendar.tsx`:
    1. **`MUSE-06` (`src/main/ai-assistant/ai-translator-agent.ts`)**: Xây dựng bộ dịch tự động Dual-Engine (Mặc định dùng Free Translator qua HTTPS + Bộ trích xuất ngày giờ đa ngôn ngữ Hàn/Nhật/Anh/Việt không cần API Key; đồng thời hỗ trợ tùy chọn nhập Gemini/OpenAI API Key được mã hóa bằng `safeStorage`) để điền `translatedBody`, `todo.translatedMessage`, `todo.dueAt` và tự động sinh `ScheduleEvent` khi Sếp nhắn lịch họp/deadline.
    2. **`MUSE-07` (`src/main/ai-assistant/scheduler-alarm.ts` & `ScheduleCalendar.tsx`)**: Tiến trình ngầm kiểm tra nhắc hẹn trước `reminderMinutesBefore` phút bằng Desktop Notification + bổ sung form thêm/xóa sự kiện và nút thêm nhanh vào Google Calendar trong tab 📅 Lịch trình.
    3. **`MUSE-08` (KakaoTalk Auto-Follow & Auto-Hide)**: Khi KakaoTalk đang ở trạng thái đã ghép cửa sổ (`docked`), tự động di chuyển/resize theo `mainWindow` (`move`/`resize` events) và tự động thu nhỏ/ẩn tạm khi người dùng chuyển sang tab chat khác (VD: Zalo) hoặc mở Modal, rồi tự hiện lại khi quay về tab KakaoTalk.

### 💻 Báo cáo Sprint 3 từ Muse.ai
- **Trạng thái Sprint 3 (`MUSE-06`, `MUSE-07`, `MUSE-08`):** *(Muse cập nhật tại đây khi hoàn thành)*
