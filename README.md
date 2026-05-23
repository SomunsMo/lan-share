# Lan Share

> 基于 Tauri 的局域网文件与文本分享工具，通过桌面端管理、浏览器端访问的方式实现设备间快速共享。

![icon](src-tauri/icons/128x128.png)

---

## 功能

| 功能 | 描述 |
|------|------|
| **文件共享** | 从桌面端选择文件/目录，同一局域网设备通过浏览器访问 |
| **文本速传** | 复制文本到剪贴板或发送短消息，浏览器端直接查看/复制 |
| **目录上传** | 浏览器端支持选择目录上传到指定路径 |

## 快速开始

### 开发

```bash
# 安装依赖
pnpm install
cd src-web && pnpm install

# 启动 Tauri 开发模式
pnpm tauri dev

# Web 前端独立开发（浏览器访问）
cd src-web && pnpm dev
```

### 构建

```bash
pnpm tauri build
```

构建产物位于 `src-tauri/target/release/`。Web 前端由 `build.rs` 在编译时自动构建并嵌入二进制，无需手动操作。

## 原理

桌面端启动时拉起一个嵌入式 HTTP 服务器（hyper），同一局域网内其他设备可直接通过浏览器访问该服务，进行文件浏览、上传、下载和文本共享。所有文件操作直接作用于宿主机文件系统。

```
┌─────────────────────────────────────────────────────┐
│                     宿主机                           │
│                                                      │
│  ┌──────────── Tauri 桌面应用 ────────────────────┐ │
│  │                                                  │ │
│  │  ┌──────────┐     IPC      ┌──────────────────┐ │ │
│  │  │ React UI │◄───────────►│   Rust 后端       │ │ │
│  │  │  (src/)  │             │                   │ │ │
│  │  └──────────┘             │  ┌─────────────┐  │ │ │
│  │                           │  │ HTTP 服务器  │──┼─┼─│──→
│  │                           │  │  (hyper)    │  │ │ │
│  │                           │  ├─────────────┤  │ │ │
│  │                           │  │ SQLite 数据库 │  │ │ │
│  │                           │  ├─────────────┤  │ │ │
│  │                           │  │  文件系统接口 │  │ │ │
│  │                           │  └─────────────┘  │ │ │
│  │                           └────────────────────┘ │ │
│  └──────────────────────────────────────────────────┘ │
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

## HTTP API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/upload/file` | 列出共享文件 |
| POST | `/upload/file` | 上传文件（multipart） |
| GET | `/download/file` | 下载文件 |
| PUT | `/rename/file` | 重命名文件/目录 |
| DELETE | `/delete/file` | 删除文件/目录 |
| GET | `/upload/text` | 列出共享文本 |
| POST | `/upload/text` | 分享文本 |
| GET | `/config/permissions` | 获取 Web 端权限配置 |
| GET | `/web` | 访问 Web 前端页面 |
| GET | `/` | 重定向到 `/web` |

所有 JSON 接口响应格式为 `{ code, msg, data }`，返回网页的接口除外。

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

### 桌面端（`src/`）

- **React 19** + **React Router 7** + **Vite**
- **styled-components** 样式方案
- 自定义弹窗/提示组件（替代原生对话框）

### 后端（`src-tauri/`）

- **Tauri v2** — 桌面应用框架
- **hyper v1** — 嵌入式 HTTP 服务器（tokio 异步）
- **sqlx** — SQLite 数据库（配置存储 + 分享记录）
- **proc-macro** — 自定义 `#[get]`/`#[post]` 路由宏（`crates/http-macros/`）
- **build.rs** — 编译时自动构建 Web 前端并嵌入二进制

### Web 前端（`src-web/`）

- **React + Vite** 独立项目，单页应用
- **vite-plugin-singlefile** 构建为单个 HTML 文件
- **axios** HTTP 请求

## 项目结构

```
lan-share/
├── src/                        # Tauri 桌面端 UI（React）
│   └── pages/
│       ├── Home/               # 文件共享页
│       ├── TextSharingManager/ # 文本历史页
│       ├── History/            # 完整历史记录
│       └── Settings/           # 设置页
├── src-tauri/                  # Rust 后端
│   ├── build.rs                # 编译脚本：构建 web 前端 + 嵌入二进制
│   ├── src/
│   │   ├── main.rs             # 入口：初始化 SQLite → 启动 HTTP → 启动 UI
│   │   ├── lib.rs              # Tauri Builder 配置
│   │   ├── cmd/system.rs       # Tauri IPC 命令
│   │   ├── http_server/        # 自定义 HTTP 服务器
│   │   │   ├── http_server.rs  # TCP 监听 + 请求分发
│   │   │   ├── handler.rs      # 路由注册 + BaseHandler
│   │   │   ├── responses.rs    # 响应辅助
│   │   │   └── path_handler/   # 各路由处理模块
│   │   ├── db/                 # SQLite（sqlx）
│   │   │   ├── sqlite.rs       # 连接池初始化 + 建表
│   │   │   ├── entity.rs       # 数据结构
│   │   │   └── dao/            # 数据访问层
│   │   ├── config/config.rs    # 全局配置（共享目录、端口、运行时状态）
│   │   ├── tray.rs             # 系统托盘
│   │   ├── normalizer/         # URL 路径净化
│   │   └── utils/              # 工具函数
│   └── icons/                  # 应用图标
├── src-web/                    # 独立 Web 前端项目（浏览器页面）
│   └── src/
│       ├── component/          # 文件共享 / 文本共享 / 进度条等组件
│       └── service/            # HTTP API 封装（axios）
└── crates/http-macros/         # 路由声明式宏（proc-macro）
```

## 数据库

SQLite 数据库文件位于 `{config_dir}/Somunsm/LanShare/config.db`，包含两张表：

- `config` — 键值对配置
- `upload_record` — 文本/文件分享记录（类型、内容、IP、时间戳）

## 许可

MIT
