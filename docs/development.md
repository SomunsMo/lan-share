# Development Guide

## Tech Stack

### Desktop UI (`src/`)

- **React 19** + **Vite 8**, **MUI 9** (Material UI)
- **React Router 7** — page routing
- **@emotion/styled** — component styling
- **i18next** + **react-i18next** — internationalization (lazy-loaded per language, SQLite persistence)
- **qrcode.react** — QR code generation
- **@tauri-apps/api** — Tauri IPC communication

### Web UI (`src-web/`)

- **React 19** + **Vite 8**
- **@emotion/styled** — styling
- **vite-plugin-singlefile** — builds into a single HTML file (embedded into the binary at compile time)
- **axios** — HTTP API calls
- **i18next** + **react-i18next** — internationalization (static imports for singlefile compatibility)

> Do not place assets in `public/` — `vite-plugin-singlefile` cannot inline them. Use `src/assets/`.

### Rust Backend (`src-tauri/`)

- **Tauri v2** — desktop framework (tray, single instance, autostart, dialog plugin)
- **hyper v1** + **hyper-util** + **tokio** — embedded async HTTP server
- **sqlx** (SQLite) — async database (config persistence + transfer records)
- **multer** — multipart file upload parsing
- **mime_guess** — MIME type detection for file downloads
- **local-ip-address** — LAN IP auto-detection
- **listeners** — port occupancy detection
- **fs4** — free disk space query
- **directories** — cross-platform config directory paths
- **arboard** — clipboard (text + image) read/write
- **trash** — send files to recycle bin
- **reqwest** — check for updates via GitHub API
- **serde / serde_json** — serialization

### Route Macros (`crates/http-macros/`)

Custom proc-macro crate providing declarative route annotations:

- `#[get("/path")]`, `#[post("/path")]`, `#[put("/path")]`, `#[delete("/path")]`, `#[request("/path")]`
- Automatic `QueryParams` injection
- Routes auto-register into the global handler registry at compile time via `#[ctor]`
- No manual route table maintenance needed

## Prerequisites

- **Rust** (edition 2021)
- **Node.js** (v20+)
- **pnpm** (v11+)

## Development

```bash
# Install JS dependencies
pnpm install
cd src-web && pnpm install

# Start Tauri dev mode (Vite + Tauri with hot-reload)
pnpm tauri dev

# Standalone web frontend dev (browser only, no Tauri)
cd src-web && pnpm dev
```

## Build

```bash
# Production build
pnpm tauri build
```

Build artifacts are at `target/release/lan-share` (`lan-share.exe` on Windows).

The web frontend (`src-web/`) is automatically built by `build.rs` at compile time and embedded into the executable — no manual steps.

## Architecture

The desktop app launches an embedded HTTP server (`hyper`) in the background. Other devices on the same LAN access the HTTP service directly through their browsers to browse, upload, download files and share text/images. All file operations are applied to the host filesystem.

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

**Startup flow** (`src-tauri/src/main.rs` + `lib.rs`):
1. `main()` → init logger → create config directory
2. Init SQLite connection pool → create/migrate tables → load config
3. Check sharing directory (prompt on first run)
4. Read window state JSON + configured HTTP port
5. `lib.rs::run()` → Tauri Builder:
   - Register plugins (single-instance, opener, dialog, autostart)
   - `setup()`: restore window state / handle `--silent`, create tray, detect port, start HTTP server
   - `on_window_event()`: save window state on close
   - `on_menu_event()`: handle tray menu

## Project Structure

```
lan-share/
├── src/                              # Desktop UI (React 19 + MUI)
│   ├── main.jsx                      # React entry (i18n → Theme → Router)
│   ├── App.jsx                       # Layout: Navbar + Routes
│   ├── AppLight.css / AppDark.css    # Theme CSS variables
│   ├── i18n.ts                       # i18next: SQLite persistence, lazy locales
│   ├── theme.js                      # MUI theme (light/dark palettes, fonts)
│   ├── locales/{zh-CN,en}.json       # Translations
│   ├── pages/
│   │   ├── home/                     # LAN address + QR code + server status
│   │   ├── text-sharing-manager/     # Share text/images, view history
│   │   ├── history/                  # Transfer log (paginated, filterable)
│   │   ├── settings/                 # All configuration (network, system, appearance, sharing)
│   │   └── about/                    # Version info, update check
│   ├── components/
│   │   ├── navbar/                   # Bottom navigation bar
│   │   ├── dialog/                   # DialogProvider + useDialog (modal)
│   │   ├── toast/                    # ToastProvider + useToast (notifications)
│   │   └── copyButton/              # Copy to clipboard button
│   └── utils/                        # copyText, copyImage, formatFileSize, menu
│
├── src-tauri/                        # Rust backend (Tauri v2 + hyper)
│   ├── build.rs                      # Builds src-web → embeds index.html
│   ├── icons/                        # App icons
│   ├── src/
│   │   ├── main.rs                   # Entry: logger → SQLite → config → run()
│   │   ├── lib.rs                    # Tauri Builder: plugins, tray, HTTP startup
│   │   ├── tray.rs                   # System tray (double-click, context menu, quit)
│   │   ├── macos.rs                  # macOS Dock icon control
│   │   ├── cmd/
│   │   │   ├── _cmd_handler.rs       # generate_handler![] command registry
│   │   │   └── system.rs             # 68 IPC commands
│   │   ├── config/config.rs          # Global runtime state (OnceLock / RwLock)
│   │   ├── db/
│   │   │   ├── sqlite.rs             # Connection pool, table creation, migrations
│   │   │   ├── entity.rs             # Data structures (Config, TransferRecord)
│   │   │   └── dao/                  # Data access (config_dao, upload_dao)
│   │   ├── http_server/
│   │   │   ├── http_server.rs        # TCP listener + request dispatch
│   │   │   ├── handler.rs            # Route registry
│   │   │   ├── responses.rs          # Response helpers
│   │   │   └── path_handler/         # Route handlers (macro auto-registered)
│   │   │       ├── file_sharing_handler.rs
│   │   │       ├── text_sharing_handler.rs
│   │   │       ├── image_sharing_handler.rs
│   │   │       ├── record_handler.rs
│   │   │       └── web_handler.rs
│   │   ├── normalizer/               # URL path normalization
│   │   └── utils/                    # datetime, path utilities
│
├── src-web/                          # Web frontend (embedded into binary)
│   ├── src/
│   │   ├── App.jsx                   # QR code + FileSharing + TextSharing
│   │   ├── i18n.ts                   # i18next: static imports, localStorage
│   │   ├── component/
│   │   │   ├── FileSharing/          # Browse / upload / download / rename / delete
│   │   │   ├── TextSharing/          # Text/image history view & copy
│   │   │   ├── Card/                 # File list card
│   │   │   ├── Dialog/               # Modal dialog
│   │   │   ├── Toast/                # Notifications
│   │   │   └── ProgressBar/          # Upload progress
│   │   ├── service/                  # Axios instance + API methods
│   │   └── util/                     # File utilities
│   └── vite.config.js                # vite-plugin-singlefile + host:true
│
└── crates/http-macros/               # Proc-macro route annotations
    └── src/lib.rs                    # #[get/post/put/delete/request] macros
```

## HTTP API

All JSON responses follow `{ code, msg, data }`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Redirect to `/web` |
| GET | `/web` | Web frontend page |
| GET | `/upload/file` | List shared files (with permissions + free space) |
| POST | `/upload/file` | Upload files (multipart, overwrite detection) |
| GET | `/upload/file/check` | Pre-upload check (exists/permissions/space) |
| GET | `/download/file` | Download files (Content-Disposition) |
| PUT | `/rename/file` | Rename files/directories |
| DELETE | `/delete/file` | Delete files/directories (supports recycle bin) |
| POST | `/upload/text` | Share text (JSON body) |
| GET | `/upload/records` | List text + image sharing records |
| GET | `/shared-image/{id}` | Serve shared images (inline) |
| POST | `/record/copy` | Record text copy event |
| POST | `/record/download` | Record file download event |
| GET | `/config/permissions` | Get web permission settings |

## IPC Commands

68 commands registered in `_cmd_handler.rs` (`src-tauri/src/cmd/system.rs`).

**System / Status**: `get_local_ip`, `get_device_name`, `get_server_status`, `get_running_port`, `get_app_version`, `get_repo_url`, `check_update`

**File Sharing**: `set_sharing_directory`, `get_sharing_directory`, `is_sharing_root_configured`, `get_file_sharing_history`, `delete_file_sharing_record`, `clear_sharing_file`, `get_transfer_log`

**Text Sharing**: `share_text_to_lan`, `get_text_sharing_history`, `clear_sharing_text`, `delete_record`, `get_copy_records`

**Image Sharing**: `read_clipboard_image`, `copy_image_to_clipboard`, `copy_text_to_clipboard`, `set_image_sharing_dir`, `migrate_image_sharing_dir`

**Permissions** (each with get/set): `upload_enabled`, `rename_file_enabled`, `rename_folder_enabled`, `delete_file_enabled`, `delete_folder_enabled`, `upload_overwrite_enabled`, `delete_to_trash`

**Configuration**: `get/set_http_port`, `get/set_theme_setting`, `get/set_theme_color`, `get/set_language`, `get_all_settings`

**Record Toggles**: `get/set_record_copy_enabled`, `get/set_record_download_enabled`

**System**: `get/set_autostart`, `get/set_autostart_minimized`, `get/set_exclude_system_files`, `get/set_exclude_patterns`, `open_file_location`, `open_folder`, `update_tray_menu`

## Database

SQLite database at `{config_dir}/Somunsm/LanShare/config.db` (defined in `src-tauri/src/db/sqlite.rs`).

### `config` table

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `cfg_key` | TEXT UNIQUE | Config key |
| `cfg_value` | TEXT | Config value |
| `created_at` | DATETIME | Creation timestamp |

### `transfer_record` table

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `action_type` | INTEGER | `1`=text, `2`=file, `3`=text_copy, `4`=file_download, `5`=image |
| `content` | TEXT | Text content / file path / image JSON |
| `source_id` | INTEGER | Source record ID (for copy events) |
| `ip` | TEXT | Source IP |
| `is_overwrite` | INTEGER | Whether it was an overwrite `0`/`1` |
| `share_count` | INTEGER | Share count |
| `created_at` | DATETIME | Created |
| `updated_at` | DATETIME | Updated |

## Security

- **Path traversal protection**: All file path parameters processed by `sanitize_path_segment()` — `..` segments stripped, separators normalized (`src-tauri/src/normalizer/path_normalizer.rs`)
- **Filename filtering**: Dangerous characters (`\`, `/`, `:`, etc.) removed per OS
- **Permission system**: Upload, rename, delete, and overwrite disabled by default; enforced server-side
- **Recycle bin**: Deleted files sent to OS trash by default (configurable)
- **Exclude rules**: Built-in system file exclusion (`.DS_Store`, `desktop.ini`, `Thumbs.db`, etc.) + custom regex patterns
- **Network isolation**: HTTP server listens on `0.0.0.0:{port}`, reachable only within LAN

## Custom Frontend

Place your own `index.html` or `404.html` in the config directory's `frontend/` folder:

```
{config_dir}/Somunsm/LanShare/frontend/index.html
{config_dir}/Somunsm/LanShare/frontend/404.html
```

No recompilation needed — restart the app to apply changes. Falls back to the built-in embedded frontend if files don't exist.

Default `{config_dir}` locations:

| System | Path |
|--------|------|
| Windows | `C:\Users\<username>\AppData\Roaming\Somunsm\LanShare` |
| Linux | `~/.config/Somunsm/LanShare` |
| macOS | `~/Library/Application Support/Somunsm/LanShare` |

## Versioning

Version defined in `src-tauri/Cargo.toml` (also synced to `tauri.conf.json`). Semantic versioning: `MAJOR.MINOR.PATCH`.
