# 开发指南

## 技术栈

### 桌面端 UI（`src/`）

- **React 19** + **Vite 8**、**MUI 9**（Material UI）
- **React Router 7** — 页面路由
- **@emotion/styled** — 组件样式
- **i18next** + **react-i18next** — 国际化（按语言懒加载，SQLite 持久化）
- **qrcode.react** — 二维码生成
- **@tauri-apps/api** — Tauri IPC 通信

### Web 端 UI（`src-web/`）

- **React 19** + **Vite 8**
- **@emotion/styled** — 样式方案
- **vite-plugin-singlefile** — 构建为单 HTML 文件（编译时嵌入二进制）
- **axios** — HTTP API 调用
- **i18next** + **react-i18next** — 国际化（静态导入兼容单文件打包）

> 不要将资源放在 `public/` 中——`vite-plugin-singlefile` 无法将其打包。请使用 `src/assets/`。

### Rust 后端（`src-tauri/`）

- **Tauri v2** — 桌面框架（系统托盘、单实例、自动启动、对话框插件）
- **hyper v1** + **hyper-util** + **tokio** — 嵌入式异步 HTTP 服务器
- **sqlx** (SQLite) — 异步数据库（配置持久化 + 传输记录）
- **multer** — multipart 文件上传解析
- **mime_guess** — 文件下载 MIME 类型识别
- **local-ip-address** — 局域网 IP 自动检测
- **listeners** — 端口占用检测
- **fs4** — 磁盘剩余空间查询
- **directories** — 跨平台配置目录
- **arboard** — 剪贴板（文本+图片）读写
- **trash** — 回收站删除
- **reqwest** — 通过 GitHub API 检查更新
- **serde / serde_json** — 序列化

### 路由宏（`crates/http-macros/`）

自定义 proc-macro crate，提供声明式路由注解：

- `#[get("/path")]`、`#[post("/path")]`、`#[put("/path")]`、`#[delete("/path")]`、`#[request("/path")]`
- 自动注入 `QueryParams` 参数
- 编译期通过 `#[ctor]` 自动注册路由到全局处理器注册表
- 无需手动维护路由表

## 环境要求

- **Rust**（edition 2021）
- **Node.js**（v20+）
- **pnpm**（v11+）

## 开发

```bash
# 安装 JS 依赖
pnpm install
cd src-web && pnpm install

# 启动 Tauri 开发模式（Vite + Tauri，支持热重载）
pnpm tauri dev

# Web 前端独立开发（浏览器直接访问，不启动 Tauri）
cd src-web && pnpm dev
```

## 构建

```bash
# 生产构建
pnpm tauri build
```

构建产物位于 `target/release/lan-share`（Windows 下为 `lan-share.exe`）。

Web 前端（`src-web/`）在编译时由 `build.rs` 自动构建并嵌入可执行程序，无需手动操作。

## 架构原理

桌面端启动后，后台拉起一个嵌入式 HTTP 服务器（`hyper`）。同一局域网内的其他设备通过浏览器直接访问该 HTTP 服务，进行文件浏览、上传、下载和文本/图片共享。所有文件操作直接作用于宿主机文件系统。

```
┌──────────────────────────────────────────────────────┐
│                        宿主机                         │
│                                                      │
│  ┌─────────── Tauri 桌面应用 ───────────────────┐    │
│  │                                                  │  │
│  │  ┌──────────┐     IPC      ┌──────────────────┐ │  │
│  │  │ React UI │◄───────────►│   Rust 后端       │ │  │
│  │  │  (src/)  │             │                   │ │  │
│  │  └──────────┘             │  ┌─────────────┐  │ │  │
│  │                           │  │ HTTP 服务器  │──┼─┼──│──→
│  │                           │  │  (hyper)    │  │ │  │
│  │                           │  ├─────────────┤  │ │  │
│  │                           │  │ SQLite 数据库│  │ │  │
│  │                           │  ├─────────────┤  │ │  │
│  │                           │  │  文件系统接口 │  │ │  │
│  │                           │  └─────────────┘  │ │  │
│  │                           └───────────────────┘ │  │
│  └─────────────────────────────────────────────────┘  │
│                            │                          │
│                     ┌──────┴──────┐                   │
│                     │   文件系统   │                   │
│                     └─────────────┘                   │
└──────────────────────────────────────────────────────┘
                                │ 局域网
                     ┌──────────┴──────────┐
                     ↓                     ↓
                ┌────────┐           ┌────────┐
                │浏览器 A │           │浏览器 B │
                │  /web  │           │  /web  │
                └────────┘           └────────┘
```

**启动流程**（`src-tauri/src/main.rs` + `lib.rs`）：
1. `main()` → 初始化日志 → 创建配置目录
2. 初始化 SQLite 连接池 → 建表/迁移 → 加载配置
3. 检查共享目录（首次运行弹出配置引导）
4. 读取窗口状态 JSON + 已配置的 HTTP 端口
5. `lib.rs::run()` → Tauri Builder：
   - 注册插件（单实例、打开链接、对话框、自动启动）
   - `setup()`：恢复窗口状态 / 处理 `--silent` 参数、创建系统托盘、检测端口、启动 HTTP 服务器
   - `on_window_event()`：关闭时保存窗口状态
   - `on_menu_event()`：处理托盘菜单事件

## 项目结构

```
lan-share/
├── src/                              # 桌面端 UI（React 19 + MUI）
│   ├── main.jsx                      # React 入口（i18n → Theme → Router）
│   ├── App.jsx                       # 布局：导航栏 + 路由
│   ├── AppLight.css / AppDark.css    # 主题 CSS 变量
│   ├── i18n.ts                       # i18next：SQLite 持久化、懒加载翻译
│   ├── theme.js                      # MUI 主题（亮/暗色板、字体）
│   ├── locales/{zh-CN,en}.json       # 翻译文件
│   ├── pages/
│   │   ├── home/                     # 局域网地址 + 二维码 + 服务器状态
│   │   ├── text-sharing-manager/     # 分享文本/图片、查看历史
│   │   ├── history/                  # 传输日志（分页、筛选）
│   │   ├── settings/                 # 全部设置项（网络、系统、外观、共享）
│   │   └── about/                    # 版本信息、检查更新
│   ├── components/
│   │   ├── navbar/                   # 底部导航栏
│   │   ├── dialog/                   # DialogProvider + useDialog（模态弹窗）
│   │   ├── toast/                    # ToastProvider + useToast（轻提示）
│   │   └── copyButton/              # 复制到剪贴板按钮
│   └── utils/                        # copyText、copyImage、formatFileSize、menu
│
├── src-tauri/                        # Rust 后端（Tauri v2 + hyper）
│   ├── build.rs                      # 编译时构建 src-web → 嵌入 index.html
│   ├── icons/                        # 应用图标
│   ├── src/
│   │   ├── main.rs                   # 入口：日志 → SQLite → 配置 → run()
│   │   ├── lib.rs                    # Tauri Builder：插件、托盘、HTTP 启动
│   │   ├── tray.rs                   # 系统托盘（双击切换、右键菜单、退出）
│   │   ├── macos.rs                  # macOS Dock 图标控制
│   │   ├── cmd/
│   │   │   ├── _cmd_handler.rs       # generate_handler![] 命令注册中心
│   │   │   └── system.rs             # 68 个 IPC 命令
│   │   ├── config/config.rs          # 全局运行时状态（OnceLock / RwLock）
│   │   ├── db/
│   │   │   ├── sqlite.rs             # 连接池、建表、数据迁移
│   │   │   ├── entity.rs             # 数据实体（Config、TransferRecord）
│   │   │   └── dao/                  # 数据访问层（config_dao、upload_dao）
│   │   ├── http_server/
│   │   │   ├── http_server.rs        # TCP 监听 + 请求分发
│   │   │   ├── handler.rs            # 路由注册表
│   │   │   ├── responses.rs          # 响应辅助函数
│   │   │   └── path_handler/         # 路由处理器（宏自动注册）
│   │   │       ├── file_sharing_handler.rs
│   │   │       ├── text_sharing_handler.rs
│   │   │       ├── image_sharing_handler.rs
│   │   │       ├── record_handler.rs
│   │   │       └── web_handler.rs
│   │   ├── normalizer/               # URL 路径规范化
│   │   └── utils/                    # 日期时间、路径工具
│
├── src-web/                          # Web 前端（嵌入到二进制中）
│   ├── src/
│   │   ├── App.jsx                   # 二维码 + 文件共享 + 文本共享
│   │   ├── i18n.ts                   # i18next：静态导入、localStorage 持久化
│   │   ├── component/
│   │   │   ├── FileSharing/          # 文件浏览/上传/下载/重命名/删除
│   │   │   ├── TextSharing/          # 文本/图片历史查看与复制
│   │   │   ├── Card/                 # 文件列表卡片
│   │   │   ├── Dialog/               # 模态弹窗
│   │   │   ├── Toast/                # 轻提示
│   │   │   └── ProgressBar/          # 上传进度条
│   │   ├── service/                  # Axios 实例 + API 方法
│   │   └── util/                     # 文件工具函数
│   └── vite.config.js                # vite-plugin-singlefile + host:true
│
└── crates/http-macros/               # Proc-macro 路由注解
    └── src/lib.rs                    # #[get/post/put/delete/request] 宏
```

## HTTP API

所有 JSON 接口响应格式为 `{ code, msg, data }`。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 重定向到 `/web` |
| GET | `/web` | Web 前端页面 |
| GET | `/upload/file` | 列出共享文件（含权限信息 + 剩余空间） |
| POST | `/upload/file` | 上传文件（multipart，支持覆写检测） |
| GET | `/upload/file/check` | 上传前检测（文件存在/权限/空间） |
| GET | `/download/file` | 下载文件（Content-Disposition） |
| PUT | `/rename/file` | 重命名文件/目录 |
| DELETE | `/delete/file` | 删除文件/目录（支持回收站） |
| POST | `/upload/text` | 分享文本（JSON body） |
| GET | `/upload/records` | 列出文本+图片分享记录 |
| GET | `/shared-image/{id}` | 提供共享图片（内联显示） |
| POST | `/record/copy` | 记录文本复制事件 |
| POST | `/record/download` | 记录文件下载事件 |
| GET | `/config/permissions` | 获取 Web 端权限配置 |

## IPC 命令

68 个命令注册于 `_cmd_handler.rs`（`src-tauri/src/cmd/system.rs`）。

**系统/状态**：`get_local_ip`、`get_device_name`、`get_server_status`、`get_running_port`、`get_app_version`、`get_repo_url`、`check_update`

**文件共享**：`set_sharing_directory`、`get_sharing_directory`、`is_sharing_root_configured`、`get_file_sharing_history`、`delete_file_sharing_record`、`clear_sharing_file`、`get_transfer_log`

**文本共享**：`share_text_to_lan`、`get_text_sharing_history`、`clear_sharing_text`、`delete_record`、`get_copy_records`

**图片共享**：`read_clipboard_image`、`copy_image_to_clipboard`、`copy_text_to_clipboard`、`set_image_sharing_dir`、`migrate_image_sharing_dir`

**权限控制**（各含 get/set）：`upload_enabled`、`rename_file_enabled`、`rename_folder_enabled`、`delete_file_enabled`、`delete_folder_enabled`、`upload_overwrite_enabled`、`delete_to_trash`

**配置**：`get/set_http_port`、`get/set_theme_setting`、`get/set_theme_color`、`get/set_language`、`get_all_settings`

**记录开关**：`get/set_record_copy_enabled`、`get/set_record_download_enabled`

**系统**：`get/set_autostart`、`get/set_autostart_minimized`、`get/set_exclude_system_files`、`get/set_exclude_patterns`、`open_file_location`、`open_folder`、`update_tray_menu`

## 数据库

SQLite 数据库位于 `{config_dir}/Somunsm/LanShare/config.db`（定义于 `src-tauri/src/db/sqlite.rs`）。

### `config` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `cfg_key` | TEXT UNIQUE | 配置键 |
| `cfg_value` | TEXT | 配置值 |
| `created_at` | DATETIME | 创建时间 |

### `transfer_record` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `action_type` | INTEGER | `1`=文本, `2`=文件, `3`=文本复制, `4`=文件下载, `5`=图片 |
| `content` | TEXT | 文本内容 / 文件路径 / 图片 JSON |
| `source_id` | INTEGER | 来源记录 ID（用于复制事件） |
| `ip` | TEXT | 来源 IP |
| `is_overwrite` | INTEGER | 是否覆写 `0`/`1` |
| `share_count` | INTEGER | 共享次数 |
| `created_at` | DATETIME | 创建时间 |
| `updated_at` | DATETIME | 更新时间 |

## 安全

- **路径穿越防护**：所有文件路径参数经 `sanitize_path_segment()` 处理，`..` 段被剥离，分隔符被规范化（`src-tauri/src/normalizer/path_normalizer.rs`）
- **文件名过滤**：依操作系统去除危险字符（`\`、`/`、`:` 等）
- **权限系统**：上传、重命名、删除、覆写操作默认关闭，服务端强制校验
- **回收站**：删除的文件默认放入系统回收站（可配置）
- **排除规则**：内置系统文件排除（`.DS_Store`、`desktop.ini`、`Thumbs.db` 等）+ 自定义正则表达式
- **网络隔离**：HTTP 服务监听 `0.0.0.0:{port}`，仅在局域网内可达

## 自定义前端

将自定义的 `index.html` 或 `404.html` 放入配置目录的 `frontend/` 文件夹：

```
{config_dir}/Somunsm/LanShare/frontend/index.html
{config_dir}/Somunsm/LanShare/frontend/404.html
```

无需重新编译，重启应用即可生效。文件不存在时回退到内置的默认前端。

各操作系统默认 `{config_dir}` 位置：

| 系统 | 路径 |
|------|------|
| Windows | `C:\Users\<用户名>\AppData\Roaming\Somunsm\LanShare` |
| Linux | `~/.config/Somunsm/LanShare` |
| macOS | `~/Library/Application Support/Somunsm/LanShare` |

## 版本号

版本号定义在 `src-tauri/Cargo.toml` 中（与 `tauri.conf.json` 同步）。采用语义化版本：`MAJOR.MINOR.PATCH`。
