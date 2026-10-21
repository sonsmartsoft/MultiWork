# 🔍 Báo Cáo Nghiệm Thu Sprint 2 (`REV-02`) & Đặc Tả Kỹ Thuật Sprint 3 Dành Cho Muse.ai

> **Người kiểm định & Thiết kế (Architect & QA Reviewer):** Antigravity  
> **Đơn vị thực thi (Lead Developer):** Muse.ai  
> **Commits được kiểm định:** `27cf0ef`, `e9c2a12`, `408c6bd`, `602f743`, `18d03cf`, `088e159`, `34799f1`, `b474735`

---

## Phần 1: Kết Quả Nghiệm Thu `MUSE-FIX-01` & Sprint 2 (`REV-02`)

Architect đã `git pull` toàn bộ 8 commits mới nhất của Muse.ai, chạy kiểm tra `npm run typecheck`, `npm run build` và kiểm tra trực tiếp mã kết quả trong `out/preload/*.js` cùng toàn bộ module mới:

1. ✅ **`[CRITICAL-01]` Preload Self-Contained (`out/preload/*.js`) — PASSED 100%**:
   - Đã kiểm tra trực tiếp `out/preload/sidebar-preload.js` (3.05 kB) và `out/preload/base-interceptor.js` (3.39 kB): hoàn toàn không còn thư mục `out/preload/chunks/` và chỉ có duy nhất lệnh `require("electron")`. Tương thích tuyệt đối với `sandbox: true` trên Electron 33.
2. ✅ **`[CRITICAL-02]` Main-World Notification Hook — PASSED 100%**:
   - `base-interceptor.ts` đã dùng `webFrame.executeJavaScript(MAIN_WORLD_HOOK)` để bọc `window.Notification` và `ServiceWorkerRegistration.prototype.showNotification` ngay trong Main World của trang chat và truyền qua `CustomEvent('__multiwork_notification__')` về Isolated World.
3. ✅ **`[CRITICAL-03]` Xác thực `accountId` theo `event.sender.id` — PASSED 100%**:
   - `ipc-handlers.ts` đã lấy `viewManager.accountIdForWebContents(event.sender.id)` làm chuẩn duy nhất.
4. ✅ **`[HIGH-04]` Lưu trữ bền vững `directives`, `todos`, `events` (`AssistantService` + `JsonStore`) — PASSED 100%**:
   - Tách riêng `src/main/assistant-service.ts` rất sạch sẽ, tự động lưu xuống `multiwork-store.json` và đồng bộ 2 chiều với Zustand store.
5. ✅ **`[MEDIUM-05]` Debounce `flushStore()` — PASSED 100%**.
6. ✅ **`MUSE-04` (LINE Extension Loader + Context Menu bôi đen tin nhắn) & `MUSE-05` (KakaoTalk Native Docker + Registry Probe + WeChat) — PASSED 100%**:
   - `extension-loader.ts`, `kakao-docker.ts` (kèm tính năng quét Windows Registry tìm đường dẫn cài đặt tùy chỉnh ở commit `34799f1`) và nút mở nhanh cài đặt `🎯 Sếp & @mention` ngay trên bảng Assistant (commit `b474735`) được thiết kế rất chu đáo.

🎉 **Kết luận `REV-02`**: Toàn bộ Sprint 1 và Sprint 2 đạt chuẩn **100% Passed**.

---

## Phần 2: Đặc Tả Kỹ Thuật Sprint 3 Dành Cho Muse.ai (`SPRINT_3_SPEC`)

Hiện tại trong code Sprint 1 & 2, trường `translatedBody` của `BossDirective` và `translatedMessage` của `TodoItem` mới chỉ giữ nguyên văn bản gốc (`// Sprint 3: replaced by the AI translation`), và tab **📅 Lịch trình (`ScheduleCalendar.tsx`)** chưa có bộ trích xuất thời gian tự động hay chuông nhắc việc.

Trong **Sprint 3**, Muse.ai sẽ hoàn thiện **Trái tim AI của MultiWork** qua 3 hạng mục (`MUSE-06`, `MUSE-07`, `MUSE-08`):

---

### Hạng mục `MUSE-06`: Bộ Dịch Thuật Đa Ngôn Ngữ & Bóc Tách Lịch Trình / Công Việc (`src/main/ai-assistant/ai-translator-agent.ts`)

Để người dùng có thể sử dụng tính năng dịch tự động **ngay lập tức mà không bắt buộc phải có API Key trả phí**, đồng thời hỗ trợ **LLM thông minh (Gemini / OpenAI)** khi người dùng nhập API Key, Muse.ai hãy xây dựng kiến trúc **Dual-Engine (2 chế độ tự động chuyển đổi)**:

1. **Chế độ 1 — Zero-Config Free Translator + Smart Multilingual Time/Task Extractor (Mặc định luôn chạy được ngay cả khi chưa nhập API Key)**:
   - **Dịch tự động miễn phí ở Main Process**:
     - Gọi HTTPS tới endpoint dịch miễn phí (`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`) ngay trong Node.js Main Process để dịch tức thì mọi tin nhắn của Sếp / `@tag` hoặc văn bản bôi đen từ **Tiếng Hàn (`ko`), Nhật (`ja`), Anh (`en`), Trung (`zh`) $\rightarrow$ Tiếng Việt (`vi`)** (hoặc `bossRule.targetLanguage`).
   - **Bộ bóc tách Thời gian & Lịch hẹn đa ngôn ngữ (`extractScheduleAndDeadline(text, translatedText, now)`)**:
     - Nhận diện các mẫu thời gian phổ biến bằng cả tiếng Hàn, Nhật, Anh, Việt trong tin nhắn của Sếp để tự động sinh `dueAt` cho `TodoItem` và tạo `ScheduleEvent` khi `bossRule.autoCreateEvent === true`:
       - Mốc ngày: `hôm nay` / `오늘` / `今日` / `today` (+0 ngày); `ngày mai` / `sáng mai` / `chiều mai` / `내일` / `明日` / `tomorrow` (+1 ngày); `ngày kia` / `모레` / `明後日` (+2 ngày); hoặc định dạng ngày `DD/MM`, `YYYY-MM-DD`, `X월 Y일`, `X月Y日`.
       - Mốc giờ: `Xh`, `X giờ`, `HH:mm`, `X시`, `X시 Y분`, `X時`, `Xam/pm`, kèm buổi (`sáng`/`오전`/`午前` vs `chiều`/`tối`/`오후`/`午後` $\rightarrow$ cộng 12h nếu $< 12$).
       - Nếu tin nhắn có từ khóa họp/lịch hẹn (`họp`, `meeting`, `call`, `회의`, `미팅`, `화상회의`, `打ち合わせ`, `会議`, `lịch`, `schedule`, `event`) kèm mốc thời gian $\rightarrow$ Tự động tạo `ScheduleEvent` (mặc định kéo dài 60 phút, `reminderMinutesBefore: 15`).
       - Nếu là chỉ thị giao việc có mốc thời gian $\rightarrow$ Gán `dueAt` vào `TodoItem`!

2. **Chế độ 2 — LLM Co-Pilot Mode (Gemini / OpenAI-Compatible API khi người dùng cấu hình API Key)**:
   - Mở rộng `BossWatchRule` (hoặc thêm `AiConfig` trong `StoreData` & `BossWatchlistModal.tsx`):
     - Cho phép người dùng tùy chọn nhập `aiProvider: 'free-google' | 'gemini' | 'openai'`, `apiKey` (lưu mã hóa qua `safeStorage` trong `JsonStore`), và `model` (mặc định `gemini-2.5-flash` hoặc `gpt-4o-mini`).
   - Khi có `apiKey`, gọi LLM để vừa dịch mượt theo văn phong công sở, vừa trả về JSON `{ translatedText, priority, todos: [...], events: [...] }`. Nếu gọi LLM lỗi hoặc chưa cấu hình `apiKey`, tự động fallback về **Chế độ 1** để **không bao giờ bị gián đoạn**!

3. **Tích hợp vào `AssistantService` (`src/main/assistant-service.ts`)**:
   - Cả `ingestFilterResult()` (từ thông báo chat) và `ingestSelection()` (từ Context Menu chuột phải) đều đi qua `aiTranslatorAgent.processDirective(...)` để điền `translatedBody`, `todo.translatedMessage`, `todo.title` (bằng ngôn ngữ đã dịch!), `todo.dueAt` và `event: ScheduleEvent` trước khi lưu xuống `JsonStore` và gửi xuống UI!

---

### Hạng mục `MUSE-07`: Hệ Thống Chuông Nhắc Việc (`src/main/ai-assistant/scheduler-alarm.ts`) & Hoàn Thiện UI Lịch Trình (`ScheduleCalendar.tsx`)

1. **`src/main/ai-assistant/scheduler-alarm.ts`**:
   - Chạy vòng lặp kiểm tra mỗi 30 giây trên `store.data.events` và `store.data.todos` (chưa hoàn thành và có `dueAt`).
   - Khi thời gian hiện tại bước vào ngưỡng nhắc hẹn (`startTime - reminderMinutesBefore * 60_000` đối với Event, hoặc trước `dueAt` 15 phút đối với Todo) mà chưa từng nhắc (`notifiedIds` Set):
     - Bật thông báo hệ điều hành bằng Electron `Notification` (`new Notification({ title: '⏰ Nhắc việc MultiWork', body: ... }).show()`).
     - Gửi sự kiện IPC (hoặc cập nhật UI) để người dùng thấy cảnh báo nổi.
2. **Nâng cấp `ScheduleCalendar.tsx` (Tab 📅 Lịch trình)**:
   - Thêm form tạo nhanh Sự kiện / Lịch họp thủ công (Tiêu đề, Ngày giờ bắt đầu, Nhắc trước $X$ phút).
   - Thêm nút **Xoá sự kiện** (`✕`) và nút **"📅 Thêm vào Google Calendar"** (mở URL `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...` bằng `shell.openExternal` hoặc tab).

---

### Hạng mục `MUSE-08`: Đồng Bộ Tự Động Vòng Đời Cửa Sổ KakaoTalk (`src/main/native-dock/kakao-docker.ts` & `view-manager.ts`)

Hiện tại khi người dùng bấm **"Ghép cửa sổ"** cho KakaoTalk, nếu người dùng chuyển sang tab Zalo hoặc di chuyển/thay đổi kích thước cửa sổ MultiWork thì cửa sổ KakaoTalk chưa tự động di chuyển theo hoặc tự ẩn đi:
1. Lưu trạng thái `isKakaoDocked: boolean` trong `ViewManager`.
2. Khi `isKakaoDocked === true`:
   - Nếu người dùng đang ở tài khoản `kakaotalk-personal` và `chatVisible === true`: Khi cửa sổ chính `mainWindow` phát sự kiện `move` hoặc `resize` (hoặc đóng/mở cột AI Assistant / Sidebar), tự động gọi lại `dockKakaoTalk(this.viewportScreenBounds())` (có debounce ~120ms) để cửa sổ KakaoTalk bám dính mượt mà theo khung nhìn của MultiWork!
   - Nếu người dùng chuyển sang tài khoản khác (VD: chuyển sang Zalo/Messenger) hoặc mở Modal (`chatVisible === false`): Tự động thu nhỏ/ẩn tạm cửa sổ KakaoTalk (`ShowWindow($h, 6)` trên Windows / ẩn cửa sổ trên macOS) để KakaoTalk không đè lên màn hình Zalo hay Modal! Khi người dùng bấm quay lại tab `kakaotalk-personal`, tự động `dockKakaoTalk` trở lại!

---

## Phần 3: Tiêu Chí Nghiệm Thu Sprint 3 (`REV-03`)

1. **Dịch tự động hoạt động thực tế 100%**: Khi có tin nhắn tiếng Hàn/Nhật/Anh từ Sếp (hoặc khi người dùng bôi đen đoạn chữ tiếng Hàn/Nhật/Anh trong khung chat và bấm chuột phải chọn *"🤖 Dịch & Thêm vào Việc cần làm"*), thẻ Chỉ thị và Việc cần làm ở cột phải hiển thị **Bản dịch Tiếng Việt** rõ ràng kèm **Bản gốc** bên dưới.
2. **Tự động tạo `ScheduleEvent` & `dueAt`**: Tin nhắn có chứa thời gian (VD: *"내일 오후 3시에 화상회의 합시다"* hoặc *"Chiều mai 15:00 họp dự án"*) tự động sinh ra một mục trong tab **📅 Lịch trình** với đúng ngày giờ tương ứng.
3. **Chuông nhắc việc & Quản lý Lịch trình**: Tab 📅 Lịch trình cho phép thêm/xóa sự kiện và có `scheduler-alarm.ts` chạy ngầm nhắc hẹn.
4. **KakaoTalk Auto-Follow & Auto-Hide**: Khi đang ghép cửa sổ KakaoTalk mà chuyển sang tab Zalo, cửa sổ KakaoTalk tự thu nhỏ để không che Zalo; khi quay lại tab KakaoTalk hoặc kéo cửa sổ MultiWork thì KakaoTalk tự khớp lại vị trí.
5. **`npm run typecheck` & `npm run build` sạch 100%**, giữ nguyên ràng buộc `out/preload/*.js` self-contained.
