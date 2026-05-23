# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
# Main Tauri app (dev server, starts Vite + Tauri)
pnpm tauri dev

# Production build
pnpm tauri build

# Web frontend standalone (separate project for browser access)
cd src-web && pnpm build
cd src-web && pnpm dev

# Rust
cargo test                           # all tests
cargo test test_name                 # single test
cargo test -p lan-share              # main crate only
cargo test -p lan-share-http-macros  # proc-macro crate
cargo check                          # fast checks
cargo check -p lan-share-http-macros
cargo build --release

# Rust with logs
RUST_LOG=debug cargo test
RUST_LOG=trace cargo run
```

## Project Structure

A LAN file/text sharing app built with **Tauri v2** (Rust backend + React frontend + embedded HTTP server). The HTTP server lets other devices on the LAN access shared files/text via browser.

### Crate Architecture (Cargo workspace)

**`lan-share`** (`src-tauri/`) — Main Tauri app + embedded HTTP server:
- `main.rs` — Entry point: initializes logger → SQLite → loads config from DB → launches Tauri UI (HTTP server starts in Tauri's `setup` callback)
- `lib.rs` — Module tree, `QueryParams`/`BodyData` extractors, `run()` builder with tray/plugins/IPC/hooks
- `cmd/system.rs` — 25 Tauri IPC commands: config CRUD, text/file sharing, upload/rename/delete permission toggles
- `cmd/_cmd_handler.rs` — Central `generate_handler![]` registry (add new commands here)
- `http_server/` — Custom HTTP server on hyper v1:
  - `http_server.rs` — TCP listener on `0.0.0.0:{port}`, request dispatch via `handler::get_handler()`
  - `handler.rs` — Global `HANDLER_REGISTRY` (LazyLock<RwLock<HashMap>>), route matching + normalizer
  - `responses.rs` — `success()`, `success_json()`, `error()`, `redirect()`, `not_found()` helpers
  - `path_handler/*.rs` — Route handler modules (auto-registered via `#[ctor]`)
- `db/` — SQLite via sqlx: pool init, `config` + `upload_record` tables, DAO layer
- `config/config.rs` — Global app state: `OnceLock<PathBuf>` for config dir, `RwLock<PathBuf>` for sharing root, `OnceLock<u16>` for ports
- `normalizer/path_normalizer.rs` — URL path deduplication + normalization
- `utils/datetime.rs` — Timestamp formatting, has unit tests
- `tray.rs` — System tray with show/hide/quit, double-click toggle

**`lan-share-http-macros`** (`crates/http-macros/`) — Proc-macro crate for declarative HTTP routes: `#[get]`, `#[post]`, `#[put]`, `#[delete]`, `#[request]`. Wraps handler functions, generates `#[ctor]` auto-registration, injects `QueryParams` from request URI.

### Frontend

**`src/`** — Tauri Desktop UI (React 19 + React Router 7 + Vite + styled-components):
- 4 pages: Home (QR code + port status), TextSharingManager (text history), History (all upload history), Settings (config toggles)
- Custom components: dialog, toast, navbar, card
- Path alias: `@/` → `./src/`

**`src-web/`** — Standalone React + Vite web app for browser access (separate project, no React Router):
- Built with `vite-plugin-singlefile` → single `index.html` → embedded in Rust binary via `include_dir!`
- Axios for HTTP API calls to the embedded Rust server
- Components: FileSharing (upload/download/browse), TextSharing (share/view text), ProgressBar, Toast, Dialog

### Startup Flow

1. `main()` → `init()`: logger → create config dir → init SQLite → load `file_sharing_root_dir` + `http_port` from DB into global statics
2. `lan_share_lib::run()` → Tauri builder: plugins (single-instance, opener, dialog, autostart) → `setup()` callback:
   - Build tray menu
   - Init sharing root into runtime state
   - Check port occupancy via `listeners` crate → spawn HTTP server on available port
3. Frontend mounts → `fetchServerStatus()` IPC call → shows QR code or port-occupied warning

### Security Design

- Path traversal protection: `sanitize_path_segment()` strips `..` segments, normalizes separators
- Filename sanitization: strips OS-dangerous chars (`\`, `/`, `:`, etc. per platform)
- Web permissions: upload/rename/delete/overwrite are opt-in from Tauri settings UI, enforced server-side
- `not_found_handler.rs` exists but is empty (minimal surface)

### HTTP API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/upload/file` | List shared files (with permissions + disk space) |
| POST | `/upload/file` | Upload files (multipart, with overwrite check) |
| GET | `/download/file` | Download files (with Content-Disposition) |
| PUT | `/rename/file` | Rename files/folders |
| DELETE | `/delete/file` | Delete files/folders |
| GET | `/upload/text` | List shared texts |
| POST | `/upload/text` | Share text (JSON body) |
| GET | `/config/permissions` | Web permissions (upload/rename/delete) |
| GET | `/web` | Serve web frontend (custom or embedded) |
| GET | `/` | Redirect to /web |

### Database (SQLite)

Path: `{config_dir}/Somunsm/LanShare/config.db`
- `config` table: key-value config store (`cfg_key`, `cfg_value`, `created_at`)
- `upload_record` table: shared content history (`upload_type`: 1=text, 2=file; `content`, `ip`, `is_overwrite`)

### Key Patterns

- **Route registration**: Annotate `async fn` with `#[get("/path")]` → proc-macro generates a `#[ctor]` wrapper that calls `register_handler()`. No manual registration needed. The `#[request]` variant matches all HTTP methods.
- **Param injection**: `#[get("/path")] async fn handler(query_params: QueryParams)` — `QueryParams` auto-extracted from URI. `Request<Incoming>` is passed through directly.
- **Global state**: Uses `OnceLock` for immutable startup values, `RwLock` for runtime-mutable state (sharing root), `LazyLock` for the handler registry.
- **Port detection**: `listeners` crate checks if configured port is occupied before HTTP server starts; port-occupied state is exposed to frontend via `get_server_status` IPC command.
- **Note**: `path_handler/user_handler.rs` contains demo endpoints, `path_handler/not_found_handler.rs` is an empty file.

## Creating New HTTP Routes

1. Add an `async fn` in an existing or new file under `src-tauri/src/http_server/path_handler/`
2. Annotate with `#[get("/path")]`, `#[post("/path")]`, etc. (or `#[request("/path")]` for any method)
3. Use `success_json(T)` or `error(status, msg)` from `crate::http_server::responses` for responses
4. The proc-macro auto-registers via `#[ctor]` — no manual wiring needed
5. Import the module in `src-tauri/src/lib.rs` under `pub mod http_server { pub mod path_handler { ... } }`

## Creating New Tauri IPC Commands

1. Add `#[tauri::command]` async fn in `src-tauri/src/cmd/system.rs`
2. Register in `src-tauri/src/cmd/_cmd_handler.rs` via `generate_handler![...]`
3. Call from frontend: `import { invoke } from "@tauri-apps/api/core"; await invoke("command_name", { arg1: val });`
