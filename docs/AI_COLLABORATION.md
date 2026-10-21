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
| **MUSE-FIX-01** | **[Hotfix Sprint 1]** Khắc phục 5 điểm trong Báo cáo `REV-01` | **Muse.ai** | ✅ Đã nghiệm thu (`REV-02`) | [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Pass 100% |
| **MUSE-04** | **[Sprint 2 - Phần A]** Tích hợp LINE Cá nhân (`extension-loader.ts`) + Context Menu chuột phải bôi đen tin nhắn | **Muse.ai** | ✅ Đã nghiệm thu (`REV-02`) | [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Pass 100% |
| **MUSE-05** | **[Sprint 2 - Phần B]** Tích hợp KakaoTalk Cá nhân (`kakao-docker.ts`) + Windows Registry Probe + WeChat | **Muse.ai** | ✅ Đã nghiệm thu (`REV-02`) | [`docs/SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md`](./SPRINT_1_REVIEW_AND_SPRINT_2_SPEC.md) | Pass 100% |
| **REV-02** | Kiểm tra, Review Code & Nghiệm thu kết quả `MUSE-FIX-01` + Sprint 2 (`MUSE-04`, `MUSE-05`) | **Architect** | ✅ Đã xong | Báo cáo tại [`docs/SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md`](./SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md) | Tất cả các hạng mục đạt chuẩn 100% |
| **MUSE-06.A** | **[Sprint 3]** Tích hợp Google Gemini AI Engine + `safeStorage` mã hóa key + `AISettingsModal.tsx` | **Muse.ai** | ✅ Đã xong (`9f7c30f`, `71b06a5`) | Xem `src/main/ai-service.ts` & `AISettingsModal.tsx` | Đã test typecheck & build sạch |
| **MUSE-06.B** | **[Sprint 3]** Fallback Dịch Miễn Phí (Google Translate HTTPS) khi chưa có API Key + Tự động trích xuất Lịch hẹn (`ScheduleEvent`) từ tin nhắn Sếp | **Muse.ai** | ✅ Đã xong — chờ `REV-03` | Xem `src/main/ai-service.ts` (`translateFree`, `extractScheduleAndDeadline`) & `assistant-service.ts` | Đảm bảo app luôn dịch được kể cả khi chưa nhập key |
| **MUSE-07** | **[Sprint 3]** Hệ thống Chuông Nhắc Việc ngầm (`scheduler-alarm.ts`) & Nâng cấp tab 📅 Lịch trình (`ScheduleCalendar.tsx`) | **Muse.ai** | ✅ Đã xong — chờ `REV-03` | Xem `src/main/ai-assistant/scheduler-alarm.ts` & `ScheduleCalendar.tsx` | Bắn Desktop Notification trước 15p + Thêm vào Google Calendar |
| **MUSE-08** | **[Sprint 3]** Đồng bộ tự động cửa sổ KakaoTalk (Auto-Follow khi resize/move & Auto-Hide khi đổi tab Zalo) | **Muse.ai** | ✅ Đã xong — chờ `REV-03` | Xem `view-manager.ts` (`syncKakaoVisibility`) & `kakao-docker.ts` (`minimizeKakaoTalk`) | Giữ trải nghiệm cửa sổ thống nhất |
| **REV-03** | Nghiệm thu toàn diện Sprint 3 (`MUSE-06..08`) | **Architect** | ⏳ Chờ Muse hoàn tất | — | Sẽ thực hiện ngay khi Muse push |

---

## 4. Nhật ký Phối hợp & Review (Architecture & QA Log)

### 🏛️ Ghi chú từ Architect gửi Muse.ai (Tiếp tục Sprint 3)
- **Đánh giá cao Muse.ai:** Hai commit `9f7c30f` và `71b06a5` của bạn đã xây dựng xuất sắc khung kết nối **Google Gemini (`ai-service.ts`)** với cơ chế bảo mật khóa `safeStorage` và giao diện cấu hình `AISettingsModal.tsx`! Build và typecheck chạy rất mượt.
- **Để hoàn thiện 100% Sprint 3 (theo đúng yêu cầu của người dùng về Dịch chỉ thị Sếp + Đặt Event/Schedule), hãy tiếp tục thực hiện 3 điểm sau**:
  1. **`MUSE-06.B` (Free Translation Fallback + Event Extraction)**:
     - Trong `ai-service.ts`: Khi người dùng **chưa nhập Gemini API Key** (hoặc chọn `provider === 'off'`), thêm hàm fallback gọi HTTPS Google Translate công khai (`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=...`) để tin nhắn của Sếp / bôi đen chuột phải vẫn được tự động dịch sang tiếng Việt mà không bắt buộc người dùng phải có thẻ thanh toán mua API key.
     - Trong `ai-service.ts` và `assistant-service.ts`: Bổ sung hàm bóc tách **Lịch hẹn / Cuộc họp (`ScheduleEvent`)** khi Sếp nhắn thời gian (VD: *"mai 10h họp"* hay *"오후 3시에 회의"*) để tự động thêm vào `store.data.events`.
  2. **`MUSE-07` (Hệ thống Chuông Nhắc Lịch Trình)**:
     - Tạo `src/main/ai-assistant/scheduler-alarm.ts`: Chạy ngầm định kỳ mỗi 30s để kiểm tra `store.data.events` (và `todos` có `dueAt`), bắn `new Notification({ title: '⏰ Nhắc việc MultiWork', body: ... }).show()` trước giờ hẹn 15 phút.
     - Nâng cấp `ScheduleCalendar.tsx`: Cho phép người dùng bấm nút `+ Thêm lịch hẹn thủ công`, nút `✕` để xóa sự kiện, và nút `📅 Thêm vào Google Calendar` (mở link template Google Calendar).
  3. **`MUSE-08` (KakaoTalk Auto-Follow & Auto-Hide)**:
     - Trong `view-manager.ts` và `kakao-docker.ts`: Khi cửa sổ KakaoTalk đang ở chế độ ghép (`docked`), lắng nghe `mainWindow.on('move')` và `mainWindow.on('resize')` để tự động kéo cửa sổ KakaoTalk di chuyển theo khung nhìn của MultiWork; đồng thời tự động thu nhỏ KakaoTalk khi chuyển sang tab Zalo/Messenger/Modal và hiện lại khi quay lại tab KakaoTalk.

### 💻 Báo cáo từ Muse.ai (Hoàn tất Sprint 3 — chờ `REV-03`)

Đã triển khai xong 3 hạng mục còn lại của Sprint 3 theo đúng đặc tả `docs/SPRINT_2_REVIEW_AND_SPRINT_3_SPEC.md` và ghi chú bổ sung của Architect tại commit `c0effdd`:

1. **`MUSE-06.B` — Free Translation Fallback + Event Extraction** (`src/main/ai-service.ts`, `src/main/assistant-service.ts`):
   - `aiService.translate()` thành chuỗi 2 tầng: có key Gemini → LLM; chưa có key **hoặc LLM lỗi** → tự rớt xuống `translateFree()` gọi endpoint `translate.googleapis.com/translate_a/single?client=gtx` — dịch không bao giờ gãy. Pipeline `enrich()` không còn khóa cứng ở `isReady()` nữa.
   - `extractScheduleAndDeadline(text, now)`: bộ trích xuất regex đa ngôn ngữ (Việt/Hàn/Nhật/Anh) — mốc ngày (hôm nay/ngày mai/ngày kia, `DD/MM`, `YYYY-MM-DD`, `X월 Y일`, `X月Y日`), mốc giờ (`HH:mm`, `Xh`, `X giờ`, `X시 Y분`, `X時`, `am/pm`, buổi sáng/chiều/tối · 오전/오후 · 午前/午後), từ khóa họp. Điền `todo.dueAt`, viết tiêu đề To-Do bằng ngôn ngữ đã dịch, và **tự tạo `ScheduleEvent`** (60 phút, nhắc trước 15 phút, chống trùng theo tài khoản + mốc giờ) khi `autoCreateEvent === true`.
   - Đã kiểm thử bằng chính ví dụ của Architect: `"mai 10h họp"` → ngày mai 10:00 ✅; `"오후 3시에 회의"` → hôm nay 15:00 ✅; `"내일 오후 3시에 화상회의 합시다"` → ngày mai 15:00 ✅; `"Chiều mai 15:00 họp dự án"` ✅; `"会議は明日10時から"` ✅; `"Meeting at 3pm tomorrow"` ✅.
2. **`MUSE-07` — Scheduler Alarm & Schedule UI** (`src/main/ai-assistant/scheduler-alarm.ts`, `ScheduleCalendar.tsx`):
   - Vòng lặp 30s quét `events` + `todos` có `dueAt` chưa xong; vào ngưỡng nhắc (event: `startTime - reminderMinutesBefore`; todo: trước hạn 15 phút) thì bắn Electron `Notification` (`⏰ Nhắc việc MultiWork`) 1 lần/duy nhất mỗi mốc (`notifiedIds`) + đẩy IPC `assistant:alarm` để panel hiện banner tắt được.
   - Tab 📅 Lịch trình: form **+ Thêm lịch hẹn thủ công** (tiêu đề, ngày giờ, nhắc trước 5/15/30/60 phút), nút **✕ xóa** từng sự kiện, nút **📅 Thêm vào Google Calendar** mở link template qua IPC `shell:open-external` (Main chỉ cho phép đúng host `calendar.google.com`).
3. **`MUSE-08` — Kakao Auto-Follow & Auto-Hide** (`view-manager.ts`, `kakao-docker.ts`):
   - `ViewManager` giữ trạng thái `kakaoDocked` (IPC `kakao:dock` thành công mới bật); lắng nghe `move`/`resize` của cửa sổ chính → debounce 120ms → `dockKakaoTalk(viewportScreenBounds())` bám theo; `setLayout`/`switchTo`/`removeView` đều đồng bộ lại: ở tab KakaoTalk + viewport hiện → ghép lại, chuyển tab khác hoặc mở Modal → `minimizeKakaoTalk()` (`ShowWindow(h, 6)` trên Windows, ẩn process trên macOS).

**Kiểm chứng:** `npm run typecheck` sạch 3 project, `npm run build` sạch, `out/preload/*.js` vẫn self-contained (2 file, `require` duy nhất là `"electron"`), smoke test boot OK. Kính nhờ Architect nghiệm thu `REV-03`.
