# 🤝 Hướng Dẫn Làm Việc Chung & Phân Công Vai Trò (AI Collaboration Guide)

Dự án: **MultiWork** — https://github.com/sonsmartsoft/MultiWork.git  
File này là **Bảng điều phối trung tâm (Single Source of Truth)** trên GitHub ghi nhận toàn bộ quá trình phối hợp giữa **Architect/Reviewer (Antigravity)** và **Lead Developer (Muse.ai)**.

---

## 1. Phân công Vai trò Chính thức (Theo chỉ định của Product Owner)

| Thành viên AI | Vai trò Chính thức | Phạm vi Trách nhiệm | Quyền truy cập |
|:---|:---|:---|:---|
| **Architect & QA Reviewer** *(Antigravity / Local AI)* | **Kiến trúc sư trưởng & Kiểm định (Architect & Reviewer)** | - Thiết kế kiến trúc, định nghĩa Interface/IPC Contract.<br>- Giao bài toán & tiêu chí nghiệm thu (`docs/SPRINT_*_SPEC_FOR_MUSE.md`).<br>- Pull code của Muse.ai về kiểm tra, chạy thử, review kiến trúc & báo lỗi.<br>- **KHÔNG trực tiếp viết code thực thi.** | Truy cập cả Local (`E:\668.Business Applications\008.Multi Chat`) & GitHub |
| **Muse.ai** | **Kỹ sư Thực thi Chính (Lead Developer / Code Executor)** | - Đọc tài liệu kiến trúc & đặc tả Sprint trên GitHub.<br>- Trực tiếp khởi tạo và viết toàn bộ source code (`package.json`, `src/shared`, `src/main`, `src/preload`, `src/renderer`).<br>- Commit & push code lên GitHub để Architect kiểm tra. | **Chỉ truy cập qua GitHub (`origin/main` hoặc nhánh feature)** |

---

## 2. Bảng Theo Dõi Tiến Độ Toàn Dự Án (Final Task Board)

| Mã Task | Hạng mục công việc | Phụ trách | Trạng thái | Tài liệu Đặc tả / Nghiệm thu | Ghi chú |
|:---:|:---|:---:|:---:|:---|:---|
| **ARCH-01..02** | Master Plan, Kiến trúc & Đặc tả Sprint 1–3 | **Architect** | ✅ Đã xong | `docs/PLAN.md`, `docs/ARCHITECTURE.md`, `docs/AI_WORK_ASSISTANT.md` | Đã push |
| **MUSE-01..03** | **[Sprint 1]** Khung dự án, Electron Main, Preload & React UI 3 cột | **Muse.ai** | ✅ Đã nghiệm thu (`REV-02`) | [`docs/SPRINT_1_SPEC_FOR_MUSE.md`](./SPRINT_1_SPEC_FOR_MUSE.md) | Pass 100% |
| **MUSE-FIX-01** | **[Hotfix Sprint 1]** Khắc phục 5 điểm trong Báo cáo `REV-01` | **Muse.ai** | ✅ Đã nghiệm thu (`REV-02`) | [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Pass 100% |
| **MUSE-04** | **[Sprint 2 - Phần A]** Tích hợp LINE Cá nhân (`extension-loader.ts`) + Context Menu chuột phải bôi đen tin nhắn | **Muse.ai** | ✅ Đã nghiệm thu (`REV-02`) | [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Pass 100% |
| **MUSE-05** | **[Sprint 2 - Phần B]** Tích hợp KakaoTalk Cá nhân (`kakao-docker.ts`) + Windows Registry Probe + WeChat | **Muse.ai** | ✅ Đã nghiệm thu (`REV-02`) | [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Pass 100% |
| **REV-02** | Kiểm tra, Review Code & Nghiệm thu kết quả `MUSE-FIX-01` + Sprint 2 (`MUSE-04`, `MUSE-05`) | **Architect** | ✅ Đã xong | Báo cáo tại [`docs/SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md`](./SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md) | Đạt chuẩn 100% |
| **MUSE-06** | **[Sprint 3 - Phần A]** Bộ Dịch Dual-Engine (Free Google Translate + Optional Gemini LLM) & Bóc tách Lịch hẹn/Deadline đa ngôn ngữ | **Muse.ai** | ✅ Đã nghiệm thu (`REV-03`) | Xem `src/main/ai-service.ts` & `assistant-service.ts` | Pass 100% |
| **MUSE-07** | **[Sprint 3 - Phần B]** Hệ thống Chuông Nhắc Việc ngầm (`scheduler-alarm.ts`) & Nâng cấp tab 📅 Lịch trình (Google Calendar sync) | **Muse.ai** | ✅ Đã nghiệm thu (`REV-03`) | Xem `src/main/ai-assistant/scheduler-alarm.ts` & `ScheduleCalendar.tsx` | Pass 100% |
| **MUSE-08** | **[Sprint 3 - Phần C]** KakaoTalk Auto-Follow khi resize/move & Auto-Hide khi chuyển sang tab Zalo/Messenger/Modal | **Muse.ai** | ✅ Đã nghiệm thu (`REV-03`) | Xem `view-manager.ts` & `kakao-docker.ts` | Pass 100% |
| **REV-03** | **Nghiệm thu toàn diện Sprint 3 & Tổng kết Bàn giao Dự án** | **Architect** | 🏆 **PASSED 100%** | Báo cáo tại [`docs/PROJECT_COMPLETION_REPORT.md`](./PROJECT_COMPLETION_REPORT.md) | Toàn bộ yêu cầu của người dùng đã hoàn thành xuất sắc |

---

## 3. Nhật ký Nghiệm thu Cuối cùng (`REV-03` Final Approval)

### 🏛️ Đánh giá từ Architect gửi Muse.ai (2026-10-21)
- **Kính gửi Muse.ai:** Tôi đã hoàn tất kiểm tra và nghiệm thu toàn diện mã nguồn Sprint 3 tại các commit `de53132`, `390f998`, `55c2821` và `09d22f5`.
- **Kết quả nghiệm thu:**
  1. `npm run typecheck` sạch 100% trên cả 3 project.
  2. `npm run build` xuất bản thành công toàn bộ bundle (`out/main`, `out/preload`, `out/renderer`).
  3. Cả hai file preload `sidebar-preload.js` và `base-interceptor.js` đạt chuẩn self-contained tuyệt đối, không có external chunks.
  4. Cơ chế dịch Dual-Engine hoạt động hoàn hảo: dịch miễn phí tức thì mà không cần API key, và kích hoạt LLM Gemini khi người dùng cấu hình key.
  5. Cơ chế bóc tách thời gian (`extractScheduleAndDeadline`) và chuông nhắc hẹn ngầm (`SchedulerAlarm`) hoạt động chính xác với các mẫu câu tiếng Hàn, Nhật, Anh, Việt.
  6. Cơ chế điều phối cửa sổ KakaoTalk tự động bám dính khi di chuyển/thay đổi kích thước và tự ẩn khi đổi tab mang lại trải nghiệm 1 cửa sổ liền mạch.
- **Dự án MultiWork chính thức hoàn thành và sẵn sàng sử dụng!**
