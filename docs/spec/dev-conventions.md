# 开发约定

## 路径别名

- `@/` → `./src/`（前端桌面端）
- Toast 组件: `@/components/toast/index.jsx`（也可用相对路径 `../../components/toast/index.jsx`）

## 技术栈约束

- **Tauri v2** — `#[tauri::command]` 在 `system.rs` 中定义，`_cmd_handler.rs` 中注册
- **React 19 + MUI** — 页面在 `src/pages/`，自定义组件在 `src/components/`
- **@emotion/styled** — 每个页面有一个 `style.js` 文件使用 `styled.div`
- **i18next + react-i18next** — 翻译文件在 `src/locales/` 和 `src-web/src/locales/`
- **SQLx (SQLite)** — 异步数据库操作，`tokio` 运行时
- **Hyper v1** — 嵌入的 HTTP 服务器，`http_server/` 目录

## 新增 IPC 命令流程

1. `src-tauri/src/cmd/system.rs` — 添加 `#[tauri::command]` 函数
2. `src-tauri/src/cmd/_cmd_handler.rs` — 在 `generate_handler![]` 中注册
3. 前端调用: `import { invoke } from "@tauri-apps/api/core"; await invoke("command_name", { arg1: val })`

## 前端 Toast 使用

```jsx
import {useToast} from "@/components/toast/index.jsx";

const {showToast} = useToast();
showToast({message: '内容', type: 'success'}); // 'success' | 'error' | 'info'
```
