# Kiến Trúc Hệ Thống & Thiết Kế Kỹ Thuật (System Architecture)

Tài liệu này mô tả kiến trúc chi tiết của **MultiWork**, bao gồm mô hình tiến trình (Process Model), cơ chế lưu trữ phiên vĩnh viễn (Session Vault), cấu trúc thư mục mã nguồn và giao thức giao tiếp IPC.

---

## 1. Sơ đồ Kiến trúc Tổng thể (High-Level Architecture)

```mermaid
flowchart TB
    subgraph MainWindow["Cửa sổ chính MultiWork (BaseWindow)"]
        direction LR
        Sidebar["Sidebar UI (React + Tailwind)\nWebContentsView #0"]
        
        subgraph Viewport["Vùng Hiển Thị Chính (Active Viewport Area)"]
            direction TB
            ZaloView["Zalo View\n(persist:acc_zalo_1)"]
            MsgView["Messenger View\n(persist:acc_msg_1)"]
            NaverView["Naver Works View\n(persist:acc_naver_1)"]
            TgView["Telegram View\n(persist:acc_tg_1)"]
            LineView["LINE Extension View\n(persist:acc_line_1)"]
            KakaoDock["KakaoTalk Native Dock\n(Win32 SetParent / macOS AXUI)"]
        end
    end

    subgraph MainProcess["Electron Main Process (Node.js Core)"]
        ViewMgr["View & Partition Manager"]
        SessionVault["Persistent Session Vault\n(Cookie Extender + Encrypted SQLite)"]
        KeepAlive["Heartbeat & Anti-Logout Engine"]
        NativeBridge["OS Native Window Bridge\n(Koffi Win32 / macOS Accessibility)"]
        NotifHub["Unified Notification & Badge Hub"]
    end

    Sidebar <-->|"IPC Invoke / Events"| ViewMgr
    ViewMgr --> ZaloView & MsgView & NaverView & TgView & LineView
    NativeBridge --> KakaoDock
    SessionVault -->|"Auto-Save / Restore Cookies & UA"| ViewMgr
    KeepAlive -->|"Periodic Background Ping"| ViewMgr
    ZaloView & MsgView & NaverView & TgView & LineView -->|"Preload IPC (Unread Count)"| NotifHub
    NotifHub -->|"Update Badge"| Sidebar
```

---

## 2. Cơ chế Lưu trữ Phiên Vĩnh viễn (Persistent Session Vault Flow)

```mermaid
sequenceDiagram
    participant User as Người dùng
    participant UI as MultiWork Sidebar
    participant Main as SessionVault (Main Process)
    participant View as WebContentsView (Isolated Partition)
    participant Server as Chat Server (Zalo/Naver/Messenger...)

    User->>UI: Thêm tài khoản mới (VD: Zalo #1)
    UI->>Main: tạo Account(uuid, type="zalo")
    Main->>Main: Khởi tạo Partition "persist:acc_<uuid>"
    Main->>Main: Cố định (Freeze) User-Agent & Fingerprint vào DB
    Main->>View: Mở https://chat.zalo.me với Partition riêng
    User->>View: Đăng nhập lần đầu (Quét QR / Nhập mật khẩu)
    Server-->>View: Trả về Cookies (zpw_sek, xs...) + lưu IndexedDB
    View-->>Main: Sự kiện cookies.on('changed')
    Main->>Main: Chuyển Session Cookie -> Persistent Cookie (365 ngày)
    Main->>Main: Sao lưu bản chụp Cookie đã mã hóa (OS Keychain / DPAPI)

    Note over Main,Server: Khi ứng dụng đang chạy hoặc thu nhỏ
    loop Mỗi 15 phút (Keep-Alive Heartbeat)
        Main->>View: Kích hoạt ngầm (Anti-Idle Ping / WebSocket Check)
        View->>Server: Giữ kết nối phiên hoạt động
    end

    Note over User,Server: Khi tắt máy / Mở lại MultiWork vào ngày hôm sau
    User->>Main: Khởi động lại MultiWork
    Main->>Main: Đọc Frozen User-Agent + Khôi phục Session Cookies từ Vault
    Main->>View: Nạp lại Partition "persist:acc_<uuid>"
    View->>Server: Kết nối tự động với đầy đủ Cookie + IndexedDB
    Server-->>User: Vào thẳng màn hình Chat (KHÔNG cần đăng nhập lại)
```

---

## 3. Cấu trúc Thư mục Dự án (Proposed Directory Structure)

```text
MultiWork/
├── docs/                               # Tài liệu kiến trúc & Kế hoạch nghiên cứu
│   ├── PLAN.md                         # Kế hoạch tổng thể (Master Plan)
│   ├── CHAT_PLATFORMS_ANALYSIS.md      # Phân tích kỹ thuật từng nền tảng chat
│   └── ARCHITECTURE.md                 # Tài liệu kiến trúc hệ thống
├── src/
│   ├── main/                           # Electron Main Process (Node.js + TypeScript)
│   │   ├── index.ts                    # Entry point khởi tạo BaseWindow
│   │   ├── view-manager.ts             # Quản lý vòng đời các WebContentsView
│   │   ├── session-vault.ts            # Lưu trữ Cookie vĩnh viễn, cố định User-Agent
│   │   ├── keep-alive.ts               # Tiến trình chống hết hạn phiên (Anti-Idle)
│   │   ├── extension-loader.ts         # Bộ nạp Chrome Extension (dành cho LINE)
│   │   ├── native-dock/                # Module nhúng cửa sổ ứng dụng gốc (KakaoTalk)
│   │   │   ├── win32-docker.ts         # Sử dụng Koffi/Win32 SetParent trên Windows
│   │   │   └── macos-docker.ts         # Sử dụng AXUIElement coordinator trên macOS
│   │   └── ipc-handlers.ts             # Xử lý giao tiếp IPC giữa Sidebar và Main
│   ├── preload/                        # Preload Scripts
│   │   ├── sidebar-preload.ts          # Cầu nối API cho giao diện quản lý chính
│   │   └── recipes/                    # Script theo dõi tin nhắn chưa đọc từng dịch vụ
│   │       ├── zalo.ts
│   │       ├── messenger.ts
│   │       ├── naver-works.ts
│   │       ├── telegram.ts
│   │       └── line.ts
│   ├── renderer/                       # Giao diện Sidebar & Settings (React + Tailwind)
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Sidebar.tsx             # Thanh danh sách các tài khoản chat
│   │   │   ├── AddServiceModal.tsx     # Hộp thoại thêm tài khoản (Zalo, Kakao, LINE...)
│   │   │   ├── WorkspaceSwitcher.tsx   # Chuyển đổi nhóm công việc
│   │   │   └── MasterLockScreen.tsx    # Màn hình khóa mật khẩu bảo vệ
│   │   └── store/
│   │       └── useAccountsStore.ts     # Quản lý trạng thái danh sách tài khoản
│   └── shared/                         # Kiểu dữ liệu dùng chung (TypeScript Interfaces)
│       └── types.ts
├── resources/                          # Icons, Extension CRX của LINE, Assets
├── electron-builder.yml                # Cấu hình đóng gói bộ cài Windows (.exe) & macOS (.dmg)
├── package.json
└── tsconfig.json
```

---

## 4. Thiết kế Schema Quản lý Tài khoản (`AccountConfig`)

```typescript
export type ServiceType =
  | 'zalo'
  | 'messenger'
  | 'naver-works'
  | 'telegram'
  | 'line-extension'
  | 'line-oa'
  | 'kakaotalk-native'
  | 'kakaotalk-channel'
  | 'whatsapp'
  | 'slack'
  | 'discord'
  | 'teams'
  | 'custom-web';

export interface AccountInstance {
  id: string;                      // UUID duy nhất (VD: "acc_9f8a7b...")
  serviceType: ServiceType;        // Loại dịch vụ chat
  displayName: string;             // Tên gợi nhớ (VD: "Zalo Công ty", "Zalo Cá nhân")
  workspaceId: string;             // Thuộc nhóm Workspace nào
  partitionName: string;           // "persist:acc_9f8a7b..."
  frozenUserAgent: string;         // User-Agent cố định suốt vòng đời tài khoản
  customUrl?: string;              // Dùng cho Naver Works domain riêng hoặc Custom Web
  unreadCount: number;             // Số tin nhắn chưa đọc hiện tại
  isMuted: boolean;                // Tắt âm thông báo của riêng tài khoản này
  hibernationEnabled: boolean;     // Cho phép ngủ đông tiết kiệm RAM hay không
  keepAliveIntervalMinutes: number;// Chu kỳ ping giữ phiên (Mặc định: 15 phút)
}
```

---

## 5. Bảo mật & Quyền riêng tư (Security Design)

1. **Cô lập Ngữ cảnh (`contextIsolation: true`, `sandbox: true`)**:
   - Các trang web chat (Zalo, Messenger...) không thể truy cập vào Node.js API hay đọc dữ liệu của các tab khác.
2. **Mã hóa Cookie Snapshot bằng OS Keychain (`safeStorage`)**:
   - Mọi bản sao lưu token/cookie dùng để khôi phục phiên đều được mã hóa bằng **Windows DPAPI** (trên Windows) hoặc **macOS Keychain** (trên Mac). Nếu kẻ gian copy thư mục dữ liệu sang máy tính khác cũng không thể giải mã được.
3. **Master Password / Biometric Lock**:
   - Hỗ trợ khóa nhanh giao diện bằng phím tắt `Ctrl/Cmd + L` khi rời bàn làm việc.
