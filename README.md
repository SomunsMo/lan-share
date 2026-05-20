# Lan Share

> 基于 Tauri 的局域网文件与文本分享工具，通过桌面端管理、浏览器端访问的方式实现设备间快速共享。

![icon](src-tauri/icons/128x128.png)

---

## 功能

| 功能       | 描述                         |
|----------|----------------------------|
| **文件共享** | 从桌面端选择文件/目录，同一局域网设备通过浏览器访问 |
| **文本速传** | 复制文本到剪贴板或发送短消息，浏览器端直接查看/复制 |
| **目录上传** | 浏览器端支持选择目录上传到指定路径          |

## 原理

桌面端使用 Tauri 渲染 UI，Rust 后端在启动时启动一个嵌入式 HTTP 服务器（hyper）。
同一局域网内的其他设备可通过浏览器访问该 HTTP 服务，进行文件浏览、上传、下载和文本共享。
所有文件操作直接作用于宿主机文件系统。

```
┌─────────────────────────────────────────────┐
│                 宿主机器                      │
│  ┌────────────────────────────────────────┐ │
│  │  Tauri UI (React)  ←→  Rust Backend   │ │
│  │                          ┊             │ │
│  │            HTTP Server (hyper) ────────┤─│─→ 浏览器 A
│  │                          ┊             │ │
│  └────────────────────────────────────────┘ │
│                          ┊                   │
└──────────────────────────────────────────────┘
                          ┊ 局域网
               ┌──────────┴──────────┐
               ↓                     ↓
           浏览器 B               浏览器 C
```

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
- **include_dir!** — 将 Web 前端静态资源嵌入二进制

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
│       └── Settings/           # 设置页
├── src-tauri/                  # Rust 后端
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
│   │   └── normalizer/         # URL 路径净化
│   ├── static/frontend/        # 构建后的 Web 前端（embedded）
│   └── icons/                  # 应用图标
├── src-web/                    # 独立 Web 前端项目
│   └── src/
│       ├── pages/FileSharing/  # 文件浏览/上传/下载页
│       └── pages/TextSharing/  # 文本查看页
└── crates/http-macros/         # 路由声明式宏（proc-macro）
```

## HTTP API

| 方法     | 路径                    | 说明              |
|--------|-----------------------|-----------------|
| GET    | `/upload/file`        | 列出共享文件          |
| POST   | `/upload/file`        | 上传文件（multipart） |
| GET    | `/download/file`      | 下载文件            |
| PUT    | `/rename/file`        | 重命名文件/目录        |
| DELETE | `/delete/file`        | 删除文件/目录         |
| GET    | `/upload/text`        | 列出共享文本          |
| POST   | `/upload/text`        | 分享文本            |
| GET    | `/config/permissions` | 获取 Web 端权限配置    |
| GET    | `/web`                | 访问 Web 前端页面     |
| GET    | `/`                   | 重定向到 `/web`     |

## 快速开始

### 开发

```bash
# 安装依赖
pnpm install

# 启动 Tauri 开发模式
pnpm tauri dev

# Web 前端独立开发
cd src-web && pnpm dev
```

### 构建

```bash
pnpm tauri build
```

构建产物位于 `src-tauri/target/release/`。

### 数据库

SQLite 数据库文件位于 `{config_dir}/Somunsm/LanShare/config.db`，包含两张表：

- `config` — 键值对配置
- `upload_record` — 文本分享记录（类型、内容、IP、时间戳）

## 许可

MIT
