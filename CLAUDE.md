# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
# Main Tauri app (dev server)
pnpm tauri dev

# Production build
pnpm tauri build

# Web frontend (standalone, for src-web/)
cd src-web && pnpm build
cd src-web && pnpm dev

# Rust tests
cargo test

# Single Rust test
cargo test test_name

# Rust check (fast)
cargo check
```

## Project Structure

This is a LAN file/text sharing app built with Tauri v2.

### Three code areas:

- **`src/`** — Tauri Desktop UI (React 19 + React Router 7 + Vite + styled-components). 3 pages: Home (file sharing), TextSharingManager (text history), Settings (config). Custom dialog/toast components. Path alias: `@/` → `./src/`.

- **`src-tauri/`** — Rust backend (Tauri v2 app + embedded HTTP server via hyper v1). Key modules:
  - `main.rs` — entry point: initializes logger, SQLite, then spawns HTTP server + Tauri UI
  - `lib.rs` — Tauri builder setup, re-exports, param extractors (`QueryParams`, `BodyData`)
  - `cmd/system.rs` — Tauri IPC commands (get/set config, text sharing, directory management)
  - `http_server/` — custom HTTP server: `http_server.rs` (TCP listener + request dispatch), `handler.rs` (global handler registry, `BaseHandler` struct), `responses.rs` (response helpers), `path_handler/` (route handler modules)
  - `db/` — SQLite via sqlx: `sqlite.rs` (pool init + table creation), `entity.rs` (structs), `dao/` (config_dao, upload_dao)
  - `config/config.rs` — global app config (shared root dir, HTTP port, runtime state)
  - `tray.rs` — system tray setup (show/hide window, quit)
  - `normalizer/path_normalizer.rs` — URL path sanitization
  - `static/` — bundled web frontend assets (embedded via `include_dir!`)

- **`src-web/`** — Standalone React + Vite web app for browser access to the HTTP server. Single-page app, uses `vite-plugin-singlefile` to bundle into one HTML file. Axios for API calls. Build output goes to `src-tauri/static/frontend/`.

- **`crates/http-macros/`** — proc-macro crate for declarative HTTP route handlers: `#[get]`, `#[post]`, `#[put]`, `#[delete]`, `#[request]`. Handlers auto-register via `#[ctor]` on startup. Supports `QueryParams` auto-injection.

### HTTP API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/upload/file` | List shared files |
| POST | `/upload/file` | Upload files (multipart) |
| GET | `/download/file` | Download files |
| PUT | `/rename/file` | Rename files/folders |
| DELETE | `/delete/file` | Delete files/folders |
| GET | `/upload/text` | List shared texts |
| POST | `/upload/text` | Share text |
| GET | `/config/permissions` | Web permissions (upload/rename/delete) |
| GET | `/web` | Serve web frontend |
| GET | `/` | Redirect to /web |

### Database (SQLite)

Tables: `config` (key-value), `upload_record` (shared texts with type/content/IP/timestamp). File at `{config_dir}/Somunsm/LanShare/config.db`.

### Key Design Decisions

- Routes registered via `#[ctor]` (constructor attribute), no manual registration needed
- The web frontend (`src-web/`) is a separate Vite project that gets built into a single HTML file and embedded in the Rust binary via `include_dir!`
- Upload/rename/delete permissions are togglable from the Tauri settings UI and enforced server-side
- The HTTP server runs on a configurable port (default 3000), using hyper v1 with tokio
- System tray: close button hides to tray instead of quitting; double-click toggles window
