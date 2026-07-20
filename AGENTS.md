# AGENTS.md

AI 编程助手上下文与约定。

## 项目概况

Tauri2 跨平台 (Win/Mac/Linux)，每次修改须兼容所有平台。

## 项目结构

- Rust 后端 (`src-tauri/`): HTTP 服务器、数据库、IPC 命令；`cargo check`
- 桌面软件前端 (`src/`): Tauri 桌面主界面（MUI）；`npm run build`
- Web 前端 (`src-web/`): HTTP 对外提供的浏览器界面；`cd src-web && npm run build`

## 语言

- 使用中文回答和注释

## 强制性操作流程

每次改动前必须按序执行：

1. **读 spec** — 先读 `docs/spec/` 对应功能的 spec
2. **确认模块** — 只改当前模块的文件，不改其他模块；新增 IPC 须注册 `_cmd_handler.rs`
3. **i18n key** — 增删改前 `grep key src/ src-web/ src-tauri/` 确认无遗留引用
4. **改前准备** — 读文件上下文，理解导入和依赖
5. **构建验证** — `cargo check` / `npm run build` 必须通过，失败须修复
6. **禁止** — 猜测命令、重复依赖、TODO、跨模块修改、secrets、擅自 commit

## Commit 准则

- 先基础改动后依赖改动，用英文以功能为单位分别 commit
- 每次commit都需要用户明确指出才能commit

## 相关文档

各功能模块详细说明见 `docs/spec/`：

- `ai-docs-conventions.md` — AI 编写规范文件的规范
- `versioning.md` — 版本号规则
- `window-state.md` — 窗口状态持久化
- `autostart.md` — 开机最小化启动
- `database.md` — 数据库
- `dev-conventions.md` — 技术栈约束、路径别名、IPC 命令流程、Toast 使用
