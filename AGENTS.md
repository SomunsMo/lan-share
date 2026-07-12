# AGENTS.md

AI 编程助手上下文与约定。

## 项目概况

Tauri2 跨平台 (Win/Mac/Linux)，每次修改须兼容所有平台。

## 语言

- 使用中文回答和注释

## 行为准则

- 优先改已有文件，不新建
- 遵循既有代码风格和目录结构
- 修改前读文件上下文，理解导入和依赖
- 用户可见文本用 i18n 键，禁止硬编码
- 遵循既有组件模式 (MUI、@emotion/styled、Toast)
- Rust 改后 `cargo check`，前端改后 `npm run build`
- 未明确同意不得 commit
- 新增 IPC 须在 `_cmd_handler.rs` 注册

## 禁止

- 猜测平台命令执行（防幽灵文件）
- 引入重复依赖
- 生成 TODO/占位符代码
- 跳过构建验证
- 提交 secrets/密钥

## Commit 准则

- 先基础改动后依赖改动，用英文以功能为单位分别 commit

## 相关文档

各功能模块详细说明见 `docs/spec/`：

- `ai-docs-conventions.md` — AI 编写规范文件的规范
- `versioning.md` — 版本号规则
- `window-state.md` — 窗口状态持久化
- `autostart.md` — 开机最小化启动
- `database.md` — 数据库
- `dev-conventions.md` — 技术栈约束、路径别名、IPC 命令流程、Toast 使用
