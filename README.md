**English** | [中文文档](docs/zh-CN/README.md)

---

# Lan Share

> A cross-platform LAN sharing tool built with **Tauri** (Rust + JS), featuring an embedded **HTTP Server** and browser-based access — provides native clients for Windows / macOS / Linux

![Rust](https://img.shields.io/badge/Rust-1.85%2B-orange?logo=rust)
![Tauri](https://img.shields.io/badge/Tauri-2-ffc131?logo=tauri&logoColor=black)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

| Feature | Description |
|---------|-------------|
| **File Sharing** | Select a shared directory; any device on the LAN can browse and download files via browser |
| **Directory Upload** | Upload directories or files from the browser to the host's specified path |
| **Quick Text Share** | Paste text on the desktop, view/copy it directly from the browser — no IM forwarding needed |
| **Custom Port** | Configure the HTTP port freely from the desktop (default 3000); auto-detect and warn if the port is occupied |
| **Security** | Path traversal protection, dangerous filename character filtering; all operations (upload/rename/delete/overwrite) must be explicitly enabled from the desktop |
| **Custom Theme** | Toggle between light/dark themes, independently for desktop and web |
| **History** | Persistent storage of text and file sharing records, with viewing and deletion support |

## Quick Start

### Development

```bash
# Install dependencies
pnpm install
cd src-web && pnpm install

# Start Tauri dev mode (Vite + Tauri)
pnpm tauri dev

# Standalone web frontend dev (browser only)
cd src-web && pnpm dev
```

### Build

```bash
# Production build (automatically compiles web frontend & embeds it into the binary)
pnpm tauri build
```

Build artifacts are located at `target/release/` (Cargo workspace root), named `lan-share` (`lan-share.exe` on Windows). The web frontend is automatically built by `build.rs` at compile time and embedded into the executable — no manual steps required.

### Usage

1. Launch the desktop app → choose a **shared directory** in the settings page and enable the desired permissions
2. The home page shows the LAN access address: `http://192.168.x.x:3000`
3. Other devices on the same LAN can open a browser and visit that address

## How It Works

After the desktop app starts, it launches an embedded HTTP server (powered by `hyper`) in the background. Other devices on the same LAN access the HTTP service directly through their browsers to browse, upload, download files and share text. All file operations are applied directly to the host filesystem.

```
┌──────────────────────────────────────────────────────┐
│                     Host Machine                      │
│                                                      │
│  ┌─────────── Tauri Desktop App ───────────────────┐ │
│  │                                                  │ │
│  │  ┌──────────┐     IPC      ┌──────────────────┐ │ │
│  │  │ React UI │◄───────────►│   Rust Backend    │ │ │
│  │  │  (src/)  │             │                   │ │ │
│  │  └──────────┘             │  ┌─────────────┐  │ │ │
│  │                           │  │ HTTP Server │──┼─┼─│──→
│  │                           │  │  (hyper)    │  │ │ │
│  │                           │  ├─────────────┤  │ │ │
│  │                           │  │ SQLite DB   │  │ │ │
│  │                           │  ├─────────────┤  │ │ │
│  │                           │  │ File System │  │ │ │
│  │                           │  │ Interface   │  │ │ │
│  │                           │  └─────────────┘  │ │ │
│  │                           └───────────────────┘ │ │
│  └─────────────────────────────────────────────────┘ │
│                            │                          │
│                     ┌──────┴──────┐                   │
│                     │  File System │                   │
│                     └─────────────┘                   │
└──────────────────────────────────────────────────────┘
                               │ LAN
                    ┌──────────┴──────────┐
                    ↓                     ↓
               ┌────────┐           ┌────────┐
               │Browser A│          │Browser B│
               │  /web   │          │  /web   │
               └────────┘           └────────┘
```

**Startup flow**: `main()` → initialize logger → create config directory → initialize SQLite → load config from database → launch Tauri app → detect port in `setup` callback → start HTTP server.

## HTTP API

All JSON responses follow the format `{ code, msg, data }`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/upload/file` | List shared files (with permissions info + free disk space) |
| POST | `/upload/file` | Upload files (multipart, with overwrite detection) |
| GET | `/download/file` | Download files (with Content-Disposition) |
| PUT | `/rename/file` | Rename files/directories |
| DELETE | `/delete/file` | Delete files/directories |
| GET | `/upload/text` | List shared text records |
| POST | `/upload/text` | Share text (JSON body) |
| GET | `/config/permissions` | Get web permission settings |
| GET | `/web` | Access the web frontend |
| GET | `/` | Redirect to `/web` |

## Security

- **Path traversal protection**: All file path parameters are processed by `sanitize_path_segment()` — `..` segments are stripped, separators are normalized
- **Filename filtering**: Dangerous characters (`\`, `/`, `:`, etc.) are removed per operating system
- **Permission system**: Upload, rename, delete, and overwrite operations are disabled by default; must be explicitly enabled in the desktop settings and are enforced server-side
- **Network isolation**: The HTTP server listens on `0.0.0.0:{port}` and is only reachable within the LAN

## Custom Web Pages

The default web frontend (`/web`) is built from `src-web/` by `build.rs` and embedded into the executable at compile time.

If you want to replace it with your own pages, you can customize them as follows:

### Custom Home Page

Place `index.html` in the `frontend/` folder under the config directory. The HTTP server will load this file on startup:

```
{config_dir}/Somunsm/LanShare/frontend/index.html
```

- No need to recompile — just restart the app to apply changes
- If the file does not exist, the built-in default frontend is used

### Custom 404 Page

Similarly, place `404.html` in the same directory:

```
{config_dir}/Somunsm/LanShare/frontend/404.html
```

When a requested path does not exist, the HTTP server returns this page. If the file also does not exist, a default 404 message is shown.

### Config Directory Paths

Default `{config_dir}` locations by operating system:

| System | Path |
|--------|------|
| Windows | `C:\Users\<username>\AppData\Roaming\Somunsm\LanShare` |
| Linux | `~/.config/Somunsm/LanShare` |
| macOS | `~/Library/Application Support/Somunsm/LanShare` |

## Tech Stack

### Desktop UI (`src/`)

- **React 19** + **Vite 8**
- **React Router 7** — page routing
- **styled-components** — styling
- **react-dropzone** — drag-and-drop file upload
- **qrcode.react** — QR code generation
- **copy-to-clipboard** — clipboard copy
- **@tauri-apps/api** — Tauri IPC communication

### Web UI (`src-web/`)

- **React 19** + **Vite 8**
- **styled-components** — styling
- **vite-plugin-singlefile** — builds into a single HTML file (for embedding into the binary)
- **axios** — HTTP API calls
- **qrcode.react** + **copy-to-clipboard**

### Rust Backend (`src-tauri/`)

- **Tauri v2** — desktop app framework (system tray, single instance, autostart, dialog plugin)
- **hyper v1** + **hyper-util** + **tokio** — embedded async HTTP server
- **sqlx** (SQLite) — async database (config persistence + sharing records)
- **multer** — multipart file upload parsing
- **mime_guess** — MIME type detection for file downloads
- **local-ip-address** — automatic LAN IP detection
- **listeners** — port occupancy detection
- **fs4** — free disk space query
- **directories** — cross-platform config directory paths
- **form_urlencoded** — URL query parameter parsing
- **serde / serde_json** — serialization

### Proc-macro Route Macros (`crates/http-macros/`)

A custom proc-macro crate providing declarative route macros:

- `#[get("/path")]`, `#[post("/path")]`, `#[put("/path")]`, `#[delete("/path")]`, `#[request("/path")]`
- Automatic `QueryParams` injection
- Routes auto-register into the global handler registry at compile time via `#[ctor]`
- No manual route table maintenance needed

## Project Structure

```
lan-share/
├── src/                        # Tauri desktop UI (React 19)
│   ├── App.jsx                 # App entry (theme loading + routing)
│   ├── main.jsx                # React render entry
│   ├── AppLight.css / AppDark.css
│   ├── assets/icon/            # Navbar SVG icons (home / history / text / setting)
│   ├── components/
│   │   ├── card/               # Shared card component
│   │   ├── dialog/             # Modal dialog (replaces native dialogs)
│   │   ├── navbar/             # Bottom navigation bar
│   │   └── toast/              # Toast notification
│   └── pages/
│       ├── home/               # Home: LAN address + QR code + port status
│       ├── history/            # Full upload history
│       ├── settings/           # Settings: shared directory, permissions, port, theme, autostart
│       └── text-sharing-manager/ # Text sharing management
│
├── src-tauri/                  # Rust backend (Tauri v2 + hyper)
│   ├── build.rs                # Build-time: compiles src-web → embeds index.html
│   ├── icons/                  # App icons (multiple sizes + .ico / .icns)
│   ├── src/
│   │   ├── main.rs             # Entry: init logger → SQLite → load config → run()
│   │   ├── lib.rs              # Tauri Builder: plugins / tray / window events / HTTP startup
│   │   ├── tray.rs             # System tray: double-click toggle / context menu / quit
│   │   ├── cmd/
│   │   │   ├── _cmd_handler.rs # generate_handler![] command registry
│   │   │   └── system.rs       # 25 Tauri IPC command implementations
│   │   ├── config/config.rs    # Global runtime state (OnceLock / RwLock)
│   │   ├── db/
│   │   │   ├── sqlite.rs       # Connection pool init + table creation
│   │   │   ├── entity.rs       # Data structures (Config / UploadRecord)
│   │   │   └── dao/            # Data access layer (config_dao / upload_dao)
│   │   ├── http_server/
│   │   │   ├── http_server.rs  # TCP listener + request dispatch
│   │   │   ├── handler.rs      # Route registry (LazyLock<RwLock<HashMap>>)
│   │   │   ├── responses.rs    # Response helpers (success / error / redirect / not_found)
│   │   │   └── path_handler/   # Route handlers (auto-registered via macros)
│   │   │       ├── file_sharing_handler.rs  # File CRUD
│   │   │       ├── text_sharing_handler.rs  # Text sharing
│   │   │       └── web_handler.rs           # /web frontend page
│   │   ├── normalizer/         # URL path normalization
│   │   └── utils/              # Utility functions (datetime / path)
│
├── src-web/                    # Web frontend (React + Vite + vite-plugin-singlefile)
│   ├── vite.config.js          # Config: vite-plugin-singlefile + host:true
│   ├── src/
│   │   ├── App.jsx             # App entry (QR code + file sharing + text sharing)
│   │   ├── component/
│   │   │   ├── FileSharing/    # File browse / upload / download / rename / delete
│   │   │   ├── TextSharing/    # Text view & copy
│   │   │   ├── Card/           # File list card
│   │   │   ├── Dialog/         # Modal dialog
│   │   │   ├── Toast/          # Toast notification
│   │   │   └── ProgressBar/    # File upload progress bar
│   │   ├── service/
│   │   │   ├── MyAxios.js      # Axios instance wrapper
│   │   │   └── API.js          # HTTP API methods (file / text / config)
│   │   └── util/file.js        # Frontend file utilities
│
└── crates/http-macros/         # Proc-macro: declarative HTTP route macros
    └── src/lib.rs              # #[get] / #[post] / #[put] / #[delete] / #[request]
```

## IPC Commands

The desktop React UI calls the Rust backend via Tauri IPC. 25 commands grouped by function:

### Text Sharing
| Command | Description |
|---------|-------------|
| `get_local_ip` | Get the local LAN IP |
| `share_text_to_lan` | Share text to the LAN |
| `get_text_sharing_history` | Get text sharing history |
| `delete_text_sharing_record` | Delete a specific text record |
| `clear_sharing_text` | Clear all text sharing records |

### File Sharing
| Command | Description |
|---------|-------------|
| `set_sharing_directory` | Set the shared directory |
| `get_sharing_directory` | Get the current shared directory |
| `get_file_sharing_history` | Get file sharing history |
| `delete_file_sharing_record` | Delete a specific file record |
| `clear_sharing_file` | Clear all file sharing records |
| `get_all_upload_history` | Get all upload history |
| `is_sharing_root_configured` | Check if a shared directory is configured |

### Permission Control
| Command | Description |
|---------|-------------|
| `get_upload_enabled` / `set_upload_enabled` | Get/set upload permission |
| `get_rename_enabled` / `set_rename_enabled` | Get/set rename permission |
| `get_delete_enabled` / `set_delete_enabled` | Get/set delete permission |
| `get_upload_overwrite_enabled` / `set_upload_overwrite_enabled` | Get/set overwrite permission |

### Service Config
| Command | Description |
|---------|-------------|
| `get_http_port` / `set_http_port` | Get/set HTTP port |
| `get_running_port` | Get the actual running port |
| `get_server_status` | Get server status (including port occupancy info) |

### System Settings
| Command | Description |
|---------|-------------|
| `get_autostart` / `set_autostart` | Get/set autostart on login |
| `get_theme_setting` / `set_theme_setting` | Get/set theme (light / dark) |

## Database

The SQLite database is located at `{config_dir}/Somunsm/LanShare/config.db` and contains two tables:

### `config` Table
Key-value configuration storage.

| Field | Type | Description |
|-------|------|-------------|
| `cfg_key` | TEXT | Config key |
| `cfg_value` | TEXT | Config value |
| `created_at` | DATETIME | Creation timestamp |

### `upload_record` Table
Text/file sharing records.

| Field | Type | Description |
|-------|------|-------------|
| `upload_type` | INTEGER | Type: `1`=text, `2`=file |
| `content` | TEXT | Text content or file path |
| `ip` | TEXT | Source IP address |
| `is_overwrite` | INTEGER | Whether it was an overwrite (`0`/`1`) |
| `created_at` | DATETIME | Creation timestamp |

## License

MIT
