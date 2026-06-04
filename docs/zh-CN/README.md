[English](../README.md) | **中文**

---

# Lan Share

> 使用 **Rust** 开发的跨平台局域网共享工具 · 嵌入式 **HTTP** 服务 · 浏览器访问，免客户端 · 支持 Windows / macOS / Linux

![Rust](https://img.shields.io/badge/Rust-1.85%2B-orange?logo=rust)
![Tauri](https://img.shields.io/badge/Tauri-2-ffc131?logo=tauri&logoColor=black)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 功能

| 功能 | 描述 |
|------|------|
| **文件共享** | 选择共享目录后，局域网内任何设备通过浏览器浏览、下载文件 |
| **目录上传** | 浏览器端支持选择目录或文件上传到宿主机指定路径 |
| **文本速传** | 桌面端粘贴文本，浏览器端直接查看/复制，免去 IM 转发的麻烦 |
| **自定义端口** | 桌面端可自由配置 HTTP 端口，默认 3000，端口被占用时有自动检测提示 |
| **安全防护** | 路径穿越拦截、文件名危险字符过滤、各类操作（上传/重命名/删除/覆写）均需在桌面端显式开启 |
| **自定义主题** | 支持亮色/暗色主题切换，桌面端与 Web 端独立设置 |
| **历史记录** | 文本和文件分享记录持久化存储，支持查看和删除 |

## 快速开始

### 开发

```bash
# 安装依赖
pnpm install
cd src-web && pnpm install

# 启动 Tauri 开发模式（Vite + Tauri）
pnpm tauri dev

# Web 前端独立开发（浏览器直接访问）
cd src-web && pnpm dev
```

### 构建

```bash
# 生产构建（自动编译 Web 前端并嵌入二进制）
pnpm tauri build
```

构建产物位于 `target/release/`（Cargo 工作区根目录），产物名为 `lan-share`（Windows 为 `lan-share.exe`）。Web 前端由 `build.rs` 在编译时自动构建并嵌入可执行程序，无需手动操作。

### 使用流程

1. 启动桌面端 → 在设置页选择**共享目录**并开启所需权限
2. 桌面端主页显示局域网访问地址：`http://192.168.x.x:3000`
3. 同一局域网的其他设备打开浏览器访问该地址即可

## 原理

桌面端启动后，在后台拉起一个嵌入式 HTTP 服务器（基于 `hyper`）。同一局域网内的其他设备通过浏览器直接访问该 HTTP 服务，进行文件浏览、上传、下载和文本共享。所有文件操作直接作用于宿主机文件系统。

```
┌────────────────────────────────────────────────────┐
│                      宿主机                         │
│                                                      │
│  ┌─────────── Tauri 桌面应用 ───────────────────┐  │
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

**启动流程**：`main()` → 初始化日志 → 创建配置目录 → 初始化 SQLite → 从数据库加载配置 → 启动 Tauri 应用 → `setup` 回调中检测端口 → 启动 HTTP 服务器。

## HTTP API

所有 JSON 接口响应格式为 `{ code, msg, data }`。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/upload/file` | 列出共享文件（含权限信息 + 磁盘剩余空间） |
| POST | `/upload/file` | 上传文件（multipart，支持覆写检测） |
| GET | `/download/file` | 下载文件（含 Content-Disposition） |
| PUT | `/rename/file` | 重命名文件/目录 |
| DELETE | `/delete/file` | 删除文件/目录 |
| GET | `/upload/text` | 列出共享文本记录 |
| POST | `/upload/text` | 分享文本（JSON body） |
| GET | `/config/permissions` | 获取 Web 端权限配置 |
| GET | `/web` | 访问 Web 前端页面 |
| GET | `/` | 重定向到 `/web` |

## 安全

- **路径穿越防护**：所有文件路径参数经 `sanitize_path_segment()` 处理，`..` 段被剥离，分隔符被规范化
- **文件名过滤**：依操作系统去除危险字符（`\`、`/`、`:` 等）
- **权限系统**：上传、重命名、删除、覆写操作默认为关闭状态，需在桌面端设置页显式开启，服务端强制校验
- **网络隔离**：HTTP 服务默认监听 `0.0.0.0:{port}`，仅在局域网内可达

## 自定义网页

默认的 Web 前端（`/web`）由 `src-web/` 项目经 `build.rs` 自动构建并嵌入到可执行程序中。

若你想替换 Web 前端为自己的页面，可以通过自定义网页功能实现：

### 自定义首页

将 `index.html` 放入配置目录下的 `frontend/` 文件夹中，HTTP 服务器会在启动时优先读取该文件：

```
{config_dir}/Somunsm/LanShare/frontend/index.html
```

- 无需重新编译程序，重启应用即可生效
- 如果该文件不存在，则使用嵌入的默认前端

### 自定义 404 页面

同理，将 `404.html` 放入相同目录：

```
{config_dir}/Somunsm/LanShare/frontend/404.html
```

当请求的路径不存在时，HTTP 服务器会返回此页面。如果该文件也不存在，则返回默认的 404 提示文字。

### 配置目录路径

不同操作系统下 `{config_dir}` 的默认位置：

| 系统 | 路径 |
|------|------|
| Windows | `C:\Users\<用户名>\AppData\Roaming\Somunsm\LanShare` |
| Linux | `~/.config/Somunsm/LanShare` |
| macOS | `~/Library/Application Support/Somunsm/LanShare` |

## 技术栈

### 桌面端 UI（`src/`）

- **React 19** + **Vite 8**
- **React Router 7** — 页面路由
- **styled-components** — 样式方案
- **react-dropzone** — 文件拖拽上传
- **qrcode.react** — 二维码生成
- **copy-to-clipboard** — 剪贴板复制
- **@tauri-apps/api** — Tauri IPC 通信

### Web 端 UI（`src-web/`）

- **React 19** + **Vite 8**
- **styled-components** — 样式方案
- **vite-plugin-singlefile** — 构建为单 HTML 文件（便于嵌入二进制）
- **axios** — HTTP API 调用
- **qrcode.react** + **copy-to-clipboard**

### Rust 后端（`src-tauri/`）

- **Tauri v2** — 桌面应用框架（系统托盘、单实例、自动启动、对话框插件）
- **hyper v1** + **hyper-util** + **tokio** — 嵌入式异步 HTTP 服务器
- **sqlx** (SQLite) — 异步数据库（配置持久化 + 分享记录）
- **multer** — multipart 文件上传解析
- **mime_guess** — 文件下载 MIME 类型推断
- **local-ip-address** — 局域网 IP 自动检测
- **listeners** — 端口占用检测
- **fs4** — 磁盘剩余空间查询
- **directories** — 跨平台配置目录
- **form_urlencoded** — URL 查询参数解析
- **serde / serde_json** — 序列化

### Proc-macro 路由宏（`crates/http-macros/`）

自定义 proc-macro crate，提供声明式路由宏：

- `#[get("/path")]`、`#[post("/path")]`、`#[put("/path")]`、`#[delete("/path")]`、`#[request("/path")]`
- 自动注入 `QueryParams` 参数
- 编译期通过 `#[ctor]` 自动注册路由到全局处理器注册表
- 无需手动维护路由表

## 项目结构

```
lan-share/
├── src/                        # Tauri 桌面端 UI（React 19）
│   ├── App.jsx                 # 应用入口（主题加载 + 路由挂载）
│   ├── main.jsx                # React 渲染入口
│   ├── AppLight.css / AppDark.css
│   ├── assets/icon/            # 导航栏图标 SVG（home / history / text / setting）
│   ├── components/
│   │   ├── card/               # 通用卡片组件
│   │   ├── dialog/             # 模态弹窗（替代原生对话框）
│   │   ├── navbar/             # 底部导航栏
│   │   └── toast/              # 轻提示组件
│   └── pages/
│       ├── home/               # 主页：局域网地址 + QR 码 + 端口状态
│       ├── history/            # 完整上传历史记录
│       ├── settings/           # 设置：共享目录、权限开关、端口、主题、开机自启
│       └── text-sharing-manager/ # 文本分享管理
│
├── src-tauri/                  # Rust 后端（Tauri v2 + hyper）
│   ├── build.rs                # 编译时构建 src-web → 嵌入 index.html
│   ├── icons/                  # 应用图标（多尺寸 + .ico / .icns）
│   ├── src/
│   │   ├── main.rs             # 入口：初始化日志 → SQLite → 加载配置 → run()
│   │   ├── lib.rs              # Tauri Builder：插件 / 托盘 / 窗口事件 / HTTP 启动
│   │   ├── tray.rs             # 系统托盘：双击切换 / 右键菜单 / 退出
│   │   ├── cmd/
│   │   │   ├── _cmd_handler.rs # generate_handler![] 命令注册中心
│   │   │   └── system.rs       # 25 个 Tauri IPC 命令实现
│   │   ├── config/config.rs    # 全局运行时状态（OnceLock / RwLock）
│   │   ├── db/
│   │   │   ├── sqlite.rs       # 连接池初始化 + 建表
│   │   │   ├── entity.rs       # 数据结构（Config / UploadRecord）
│   │   │   └── dao/            # 数据访问层（config_dao / upload_dao）
│   │   ├── http_server/
│   │   │   ├── http_server.rs  # TCP 监听 + 请求分发
│   │   │   ├── handler.rs      # 路由注册表（LazyLock<RwLock<HashMap>>）
│   │   │   ├── responses.rs    # 响应辅助函数（success / error / redirect / not_found）
│   │   │   └── path_handler/   # 路由处理器（宏自动注册）
│   │   │       ├── file_sharing_handler.rs  # 文件 CRUD
│   │   │       ├── text_sharing_handler.rs  # 文本分享
│   │   │       └── web_handler.rs           # /web 前端页面
│   │   ├── normalizer/         # URL 路径标准化
│   │   └── utils/              # 工具函数（datetime / path）
│
├── src-web/                    # Web 前端（React + Vite + vite-plugin-singlefile）
│   ├── vite.config.js          # 配置：vite-plugin-singlefile + host:true
│   ├── src/
│   │   ├── App.jsx             # 应用入口（QR 码 + 文件共享 + 文本共享）
│   │   ├── component/
│   │   │   ├── FileSharing/    # 文件浏览 / 上传 / 下载 / 重命名 / 删除
│   │   │   ├── TextSharing/    # 文本查看与复制
│   │   │   ├── Card/           # 文件列表卡片
│   │   │   ├── Dialog/         # 模态弹窗
│   │   │   ├── Toast/          # 轻提示
│   │   │   └── ProgressBar/    # 文件上传进度条
│   │   ├── service/
│   │   │   ├── MyAxios.js      # axios 实例封装
│   │   │   └── API.js          # HTTP API 方法（文件 / 文本 / 配置）
│   │   └── util/file.js        # 前端文件工具函数
│
└── crates/http-macros/         # Proc-macro：声明式 HTTP 路由宏
    └── src/lib.rs              # #[get] / #[post] / #[put] / #[delete] / #[request]
```

## IPC 命令

桌面端 React UI 通过 Tauri IPC 调用 Rust 后端，25 个命令按功能分类：

### 文本共享
| 命令 | 说明 |
|------|------|
| `get_local_ip` | 获取本机内网 IP |
| `share_text_to_lan` | 分享文本到局域网 |
| `get_text_sharing_history` | 获取文本分享历史 |
| `delete_text_sharing_record` | 删除指定文本记录 |
| `clear_sharing_text` | 清空所有文本分享记录 |

### 文件共享
| 命令 | 说明 |
|------|------|
| `set_sharing_directory` | 设置共享目录 |
| `get_sharing_directory` | 获取当前共享目录 |
| `get_file_sharing_history` | 获取文件分享历史 |
| `delete_file_sharing_record` | 删除指定文件记录 |
| `clear_sharing_file` | 清空所有文件分享记录 |
| `get_all_upload_history` | 获取全部上传历史 |
| `is_sharing_root_configured` | 是否已配置共享目录 |

### 权限控制
| 命令 | 说明 |
|------|------|
| `get_upload_enabled` / `set_upload_enabled` | 获取/设置上传权限 |
| `get_rename_enabled` / `set_rename_enabled` | 获取/设置重命名权限 |
| `get_delete_enabled` / `set_delete_enabled` | 获取/设置删除权限 |
| `get_upload_overwrite_enabled` / `set_upload_overwrite_enabled` | 获取/设置覆写权限 |

### 服务配置
| 命令 | 说明 |
|------|------|
| `get_http_port` / `set_http_port` | 获取/设置 HTTP 端口 |
| `get_running_port` | 获取实际运行端口 |
| `get_server_status` | 获取服务器状态（含端口占用信息） |

### 系统设置
| 命令 | 说明 |
|------|------|
| `get_autostart` / `set_autostart` | 获取/设置开机自启 |
| `get_theme_setting` / `set_theme_setting` | 获取/设置主题（light / dark） |

## 数据库

SQLite 数据库文件位于 `{config_dir}/Somunsm/LanShare/config.db`，包含两张表：

### `config` 表
键值对配置存储。

| 字段 | 类型 | 说明 |
|------|------|------|
| `cfg_key` | TEXT | 配置键 |
| `cfg_value` | TEXT | 配置值 |
| `created_at` | DATETIME | 创建时间 |

### `upload_record` 表
文本/文件分享记录。

| 字段 | 类型 | 说明 |
|------|------|------|
| `upload_type` | INTEGER | 类型：`1`=文本, `2`=文件 |
| `content` | TEXT | 文本内容或文件路径 |
| `ip` | TEXT | 来源 IP 地址 |
| `is_overwrite` | INTEGER | 是否覆写（`0`/`1`） |
| `created_at` | DATETIME | 创建时间 |

## 许可

MIT
