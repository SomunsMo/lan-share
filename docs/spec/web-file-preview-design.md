# Web 端文件预览功能设计

日期: 2026-08-14

## 目标

web 端（src-web）对**图片 / 文本 / PDF** 类型文件提供浏览器内预览，不新增权限开关（与下载策略一致，无门控）。

## 入口与形态

- TextSharing 图片记录缩略图**左键单击** → 预览（url 为 `/shared-image/{id}`，现成 inline 端点）
- FileSharing 文件列表操作列新增"预览"按钮（仅 `!is_dir` 且类型 ∈ 图片/PDF/文本时显示）→ 预览
- 统一大尺寸浮层组件 `FilePreview`，内容为 `<iframe>`，走 `src-web/src/component/FilePreview/`（index.jsx + Style.js，遵循 styled 风格）
- 统一 iframe 的理由：PDF 依赖浏览器原生查看器（仅在 iframe/embed 可用）；自研 `pdfjs-dist` 渲染代价高，不采用

## 后端

### 新端点 `/preview/file`

- `#[get("/preview/file")]`，位于 `src-tauri/src/http_server/path_handler/file_sharing_handler.rs`（与 download 同文件，复用 `get_sharing_root`/`sanitize_path_segment`/`sanitize_filename`，http-macros 自动注册，无需改 `lib.rs`）
- 参数：`dir`（相对共享根目录，可空）、`file_name`（必填）；沿用 download 的手工 `form_urlencoded` 解析方式
- 安全：`file_name` 必须经 `sanitize_filename` 消毒（防路径遍历），`dir` 经 `sanitize_path_segment`
- 流程：`root_dir.join(dir).join(file_name)` → `metadata` 校验（存在、非目录）→ 类型分流
- 类型分流（`mime_guess`）：
  - 图片 / PDF → 直出流式，`Content-Length` = `metadata.len()`
  - 文本（`.txt/.log/.md/.csv/.json`）→ 编码分支（见下）
  - 其他 → 415 "预览不支持"（兜底）
- 响应头：`Content-Disposition: inline; filename*=UTF-8''{RFC5987}`（仿 `serve_shared_image`，image_sharing_handler.rs L85）；文本统一 `text/plain; charset=utf-8`；图片/PDF 用 `mime_guess`；`Cache-Control: no-store`

### 文本编码分支（常量 `PREVIEW_FULL_READ_LIMIT = 5MB`）

- ≤5MB：全量读 + BOM/启发式检测 → UTF-8 直出原文；GBK 等经 `encoding_rs` 转 UTF-8 后全量输出（`Content-Length` = 转换后字节数）
- >5MB：读头部 N KB 检测 → UTF-8：流式直出（`Content-Length` = 文件大小）；GBK：`Decoder::decode_to_string(&mut input, last)` 流式转码（**无 Content-Length，走 chunked**）

### 数据正确性三条纪律

1. 转码路径**绝不设 Content-Length**（长度不可预知，错误估算会导致浏览器静默截断）
2. 直出路径 `Content-Length` 精确 = `metadata.len()`
3. 分块转码必须复用同一 `Decoder`（跨块缓冲不完整多字节序列），不得逐块新建

### 其他

- download 端点顺手补 `file_name` 消毒（现为未消毒 join，属既有路径遍历隐患，file_sharing_handler.rs L509）
- 依赖新增：`encoding_rs` + `futures-util`（或 `tokio_util::io::ReaderStream` 二选一），把 `tokio::fs::File` 的 `AsyncRead` 转 `Stream`，喂给现有 `GenericResponseBody::Stream`（handler.rs L12-18）
- 流式中断（客户端断开）：写 body 报错即终止该连接任务，日志 debug 级
- 错误响应：不存在/消毒为空 → 404；目录 → 400；非预览类型 → 415（复用 `responses` 工具）

## 前端

### `FilePreview` 组件

- Props：`url` + `title`；各组件内部持 `previewUrl` state 条件渲染，不引入全局 store
- 全屏遮罩，内容卡约 `80vw × 85vh` 居中，右上角关闭按钮；点击遮罩 / Esc 关闭
- 顶部工具栏：`title` + 刷新按钮 + 关闭按钮
- iframe 撑满内容区；关闭/卸载时 iframe `src` 置空释放资源
- 加载失败兜底以刷新/关闭为主（iframe 同源加载失败难可靠捕获）

### 接入

- FileSharing.jsx：操作列预览按钮，url = `/preview/file?dir=…&file_name=…`
- TextSharing.jsx：图片记录缩略图 `<img>` 加 `onClick`，url = `/shared-image/{id}`

### i18n（zh-CN/en 同步，先 grep 确认无既有引用）

- `fileSharing.action.preview` — "预览"
- `fileSharing.preview.refresh` — "刷新"
- `fileSharing.preview.close` — "关闭"（或复用 `common.button`）

## 测试

- 后端单测（若有基建则对齐）：`sanitize_filename` 对 `../../etc/passwd` 等注入形态；编码检测分支（UTF-8/GBK/BOM）；GBK 流式转码跨块边界中文样本无损
- `cargo check` / `cargo clippy`；src-web `npm run lint` + 两端 `npm run build`
- 手动验收：局域网分别对图片/GBK 文本/UTF-8 文本/PDF 触发两处入口验证

## 改动文件清单

- `src-tauri/src/http_server/path_handler/file_sharing_handler.rs`（新端点 + download 消毒）
- `src-tauri/Cargo.toml`（encoding_rs + futures-util/tokio-util）
- `src-web/src/component/FilePreview/index.jsx` + `FilePreviewStyle.js`（新增）
- `src-web/src/component/FileSharing/FileSharing.jsx`
- `src-web/src/component/TextSharing/TextSharing.jsx`
- `src-web/src/locales/zh-CN.json` + `en.json`
