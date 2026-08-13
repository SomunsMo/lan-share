# Web 端文件预览（图片/文本/PDF）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 src-web 实现图片/文本/PDF 的浏览器内预览：新增大尺寸浮层组件用 iframe 展示，后端新增 `/preview/file` inline 端点（含文本编码检测与流式转码）。

**Architecture:** 后端新增 GET `/preview/file?dir=&file_name=`，按后缀分流：图片/PDF 直出流式（精确 Content-Length），文本 ≤5MB 全量转码、>5MB 流式（UTF-8 直出带 Content-Length / GBK 流式转码走 chunked）。前端新建 `FilePreview` 浮层组件（iframe），FileSharing 操作列与 TextSharing 图片缩略图两处入口复用。设计文档：`docs/spec/web-file-preview-design.md`。

**Tech Stack:** Rust（hyper/tokio/futures-util/encoding_rs/mime_guess）、React（@emotion/styled/i18next）。

## Global Constraints

- 只改本功能文件：`src-tauri/src/http_server/path_handler/file_sharing_handler.rs`、`src-tauri/Cargo.toml`、`src-web/src/component/FilePreview/`（新增）、`src-web/src/component/FileSharing/FileSharing.jsx`、`src-web/src/component/TextSharing/TextSharing.jsx`、`src-web/src/locales/{zh-CN,en}.json`
- HTTP 端点用 http-macros `#[get]` 自动注册，无需改 `_cmd_handler.rs`（那是 IPC 注册）
- i18n key 增删前 `grep key src/ src-web/ src-tauri/` 确认无遗留引用；中英文档同步
- 构建验证必须通过：`cargo check`、`cargo clippy --all-targets`（0 warning）、src-web `npm run lint`、两端 `npm run build`
- 数据正确性三条纪律（spec 要求）：转码路径绝不设 Content-Length（chunked）；直出路径 Content-Length 精确 = `metadata.len()`；分块转码复用同一 Decoder 跨块缓冲
- 注释用中文；不引入 TODO/重复依赖；`encoding-rs` 是唯一新增依赖
- 预览无权限开关（与下载策略一致）

---

### Task 1: 后端预览工具函数（后缀判定 / 编码检测 / GBK 流式转码）+ 单测

**Files:**
- Modify: `src-tauri/Cargo.toml`（新增 `encoding-rs = "0.8"`）
- Modify: `src-tauri/src/http_server/path_handler/file_sharing_handler.rs`

**Interfaces:**
- Consumes: 无
- Produces:
  - `const PREVIEW_IMAGE_SUFFIXES: &[&str]`、`const PREVIEW_TEXT_SUFFIXES: &[&str]`、`const PREVIEW_FULL_READ_LIMIT: u64`
  - `fn file_ext_lower(name: &str) -> String`
  - `fn is_previewable(ext: &str) -> bool`
  - `fn detect_text_encoding(data: &[u8]) -> &'static encoding_rs::Encoding`
  - `fn transcode_gbk_chunks(chunks: &[&[u8]]) -> String`（供 Task 3 流式转码复用）

- [ ] **Step 1: 添加依赖并写失败测试**

在 `src-tauri/Cargo.toml` 依赖区追加：
```toml
# 文本编码检测与转码（预览 GBK 文本）
encoding-rs = "0.8"
```

在 `file_sharing_handler.rs` 文件末尾追加：
```rust
#[cfg(test)]
mod preview_tests {
    use super::*;

    #[test]
    fn sanitize_filename_strips_traversal_separators() {
        assert!(!sanitize_filename("../../etc/passwd").contains('/'));
        // Unix 不限制反斜杠，但绝对路径开头设备名不受影响
        assert!(!sanitize_filename("..%2f..%2fsecret").contains('/'));
    }

    #[test]
    fn detect_encoding_handles_utf8_and_gbk() {
        assert_eq!(detect_text_encoding("你好".as_bytes()), encoding_rs::UTF_8);
        let (gbk_bytes, _, _) = encoding_rs::GBK.encode("你好");
        assert_eq!(detect_text_encoding(&gbk_bytes), encoding_rs::GBK);
    }

    #[test]
    fn gbk_stream_transcoding_keeps_cross_boundary_chars() {
        let (gbk, _, _) = encoding_rs::GBK.encode("中文测试abc123");
        // 块边界刻意切在可变长字节中间
        let chunks = vec![&gbk[..1], &gbk[1..4], &gbk[4..]];
        assert_eq!(transcode_gbk_chunks(&chunks), "中文测试abc123");
    }

    #[test]
    fn previewability_by_extension() {
        assert!(is_previewable(&file_ext_lower("a.pdf")));
        assert!(is_previewable(&file_ext_lower("note.MD")));
        assert!(is_previewable(&file_ext_lower("photo.jpeg")));
        assert!(!is_previewable(&file_ext_lower("a.docx")));
        assert!(!is_previewable(&file_ext_lower("noext")));
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cargo test -p lan-share preview_tests 2>&1 | tail -20`
Expected: 编译失败（`detect_text_encoding`/`is_previewable` 等函数未定义）

- [ ] **Step 3: 实现工具函数**

在 `file_sharing_handler.rs` 的 `sanitize_filename` 上方（常量区）与文件中部（私有函数区）新增：
```rust
const PREVIEW_IMAGE_SUFFIXES: &[&str] = &["bmp", "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "tiff"];
const PREVIEW_TEXT_SUFFIXES: &[&str] = &[
    "txt", "log", "md", "markdown", "csv", "json", "xml", "yaml", "yml",
    "ini", "cfg", "conf", "toml", "env", "html", "htm", "css", "js", "ts",
    "py", "rs", "java", "c", "h", "cpp", "go", "sql",
];
/// 小于该字节数的文本全量读取后转码预览，更大的走流式
const PREVIEW_FULL_READ_LIMIT: u64 = 5 * 1024 * 1024;

/// 取小写扩展名（无扩展名返回空串）
fn file_ext_lower(name: &str) -> String {
    name.rsplit('.').next().unwrap_or("").to_lowercase()
}

/// 该扩展名是否支持预览（图片/PDF/纯文本）
fn is_previewable(ext: &str) -> bool {
    PREVIEW_IMAGE_SUFFIXES.contains(&ext) || ext == "pdf" || PREVIEW_TEXT_SUFFIXES.contains(&ext)
}

/// 编码检测：先按 BOM，再尝试 UTF-8 严格解码（无报错视为 UTF-8），否则按 GBK
fn detect_text_encoding(data: &[u8]) -> &'static encoding_rs::Encoding {
    if let Some(enc) = encoding_rs::Encoding::for_bom(data) {
        return enc;
    }
    let (_, _, had_errors) = encoding_rs::UTF_8.decode_without_bom_handling(data);
    if had_errors { encoding_rs::GBK } else { encoding_rs::UTF_8 }
}

/// 流式 GBK→UTF-8 转码：复用同一 Decoder 跨块缓冲不完整多字节序列（数据正确性纪律 3）
fn transcode_gbk_chunks(chunks: &[&[u8]]) -> String {
    let mut decoder = encoding_rs::GBK.new_decoder();
    let mut out = String::new();
    for (i, chunk) in chunks.iter().enumerate() {
        let last = i == chunks.len() - 1;
        let (s, _) = decoder.decode_to_string(chunk, last);
        out.push_str(&s);
    }
    out
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cargo test -p lan-share preview_tests 2>&1 | tail -20`
Expected: 4 个测试全部 PASS；`cargo clippy --all-targets` 0 warning

- [ ] **Step 5: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/http_server/path_handler/file_sharing_handler.rs
git commit -m "feat: add preview helpers for file type, encoding detection and GBK streaming"
```

---

### Task 2: 修补 download 端点的 file_name 路径遍历漏洞

**Files:**
- Modify: `src-tauri/src/http_server/path_handler/file_sharing_handler.rs`（`download_file` L509 之前）

**Interfaces:**
- Consumes: 已有 `sanitize_filename`（本文件 L420）
- Produces: 无新接口（download_file 行为不变，仅不再可越权读任意路径）

- [ ] **Step 1: 实现消毒**

将 `download_file` 中（现 L509）：
```rust
let full_file_path = target_dir.join(file_name);
```
替换为：
```rust
let safe_file_name = sanitize_filename(file_name);
if safe_file_name.is_empty() {
    return Ok(create_error_response(StatusCode::BAD_REQUEST, "无效的文件名：file_name"));
}
let full_file_path = target_dir.join(&safe_file_name);
```
（`file_name` 变量类型为 `&String`，`sanitize_filename` 接受 `&str`，用 `file_name` 即自动解引用。）

- [ ] **Step 2: 构建验证**

Run: `cargo check 2>&1 | tail -3` 与 `cargo clippy --all-targets 2>&1 | tail -3`
Expected: 均无输出错误/warning

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/http_server/path_handler/file_sharing_handler.rs
git commit -m "fix: sanitize file_name in download endpoint against path traversal"
```

---

### Task 3: `/preview/file` 端点（分流 + 直出流式 + 全量转码 + 流式转码）

**Files:**
- Modify: `src-tauri/src/http_server/path_handler/file_sharing_handler.rs`（新增 `stream_file_inline` 与 `preview_file`）

**Interfaces:**
- Consumes: Task 1 的常量与函数、已有 `get_sharing_root`/`sanitize_path_segment`/`sanitize_filename`/`create_error_response`、`GenericResponseBody::Stream`、`mime_guess`、`form_urlencoded`
- Produces:
  - `fn stream_file_inline(file_path: PathBuf, len: u64, content_type: String, disposition: String, transcode: Option<&'static encoding_rs::Encoding>) -> Vec<Response<GenericResponseBody>>` 形态见下（实际返回单个 Response）
  - `#[get("/preview/file")] pub async fn preview_file(_req: Request<Incoming>) -> Result<Response<GenericResponseBody>, std::convert::Infallible>`

- [ ] **Step 1: 新增 import**

`file_sharing_handler.rs` 现有 import（L24 `use tokio::io::AsyncWriteExt;`）旁追加：
```rust
use tokio::io::AsyncReadExt;
```

- [ ] **Step 2: 实现流式 body 辅助**

在 `download_file` 下方新增：
```rust
/// 构造 inline 预览响应：支持直出字节流或 GBK→UTF-8 流式转码
/// transcode 为 Some 时不允许设 Content-Length（输出长度不可预知，走 chunked）
fn stream_preview_file(
    file_path: PathBuf,
    len: u64,
    content_type: String,
    disposition: String,
    transcode: Option<&'static encoding_rs::Encoding>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let (tx, rx) = tokio::sync::mpsc::channel::<Bytes>(8);
    tokio::spawn(async move {
        let mut file = match File::open(&file_path).await {
            Ok(f) => f,
            Err(_) => return, // 打开失败直接结束流（客户端将收到网络错误）
        };
        if let Some(enc) = transcode {
            let mut decoder = enc.new_decoder();
            let mut buf = vec![0u8; 64 * 1024];
            loop {
                match file.read(&mut buf).await {
                    Ok(0) => break,
                    Ok(n) => {
                        let (s, _) = decoder.decode_to_string(&buf[..n], false);
                        if tx.send(Bytes::from(s.into_bytes())).await.is_err() {
                            return; // 客户端已断开
                        }
                    }
                    Err(_) => return,
                }
            }
            let (s, _) = decoder.decode_to_string(&[], true);
            let _ = tx.send(Bytes::from(s.into_bytes())).await;
        } else {
            let mut buf = vec![0u8; 64 * 1024];
            loop {
                match file.read(&mut buf).await {
                    Ok(0) => break,
                    Ok(n) => {
                        if tx.send(Bytes::copy_from_slice(&buf[..n])).await.is_err() {
                            return;
                        }
                    }
                    Err(_) => return,
                }
            }
        }
    });

    let mut builder = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, content_type)
        .header(header::CONTENT_DISPOSITION, disposition)
        // 文件可变，不缓存，避免端口切换后展示旧内容
        .header(header::CACHE_CONTROL, "no-store");
    if transcode.is_none() {
        builder = builder.header(header::CONTENT_LENGTH, len.to_string());
    }
    builder.body(GenericResponseBody::Stream(rx)).map_err(|_| std::convert::Infallible)
}
```
（`Bytes` 未在本文件 import，需在顶部 `use hyper::body::Bytes;` 追加；`PathBuf` 用 `std::path::PathBuf`。）

- [ ] **Step 3: 实现预览端点**

在 `stream_preview_file` 下方新增：
```rust
/// 预览共享文件（图片/PDF/纯文本），返回 inline 流供 iframe 展示
#[get("/preview/file")]
pub async fn preview_file(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let query = match _req.uri().query() {
        Some(q) => q,
        None => return Ok(create_error_response(StatusCode::BAD_REQUEST, "缺少查询参数：?dir=目录&file_name=文件名")),
    };
    let params: HashMap<_, _> = form_urlencoded::parse(query.as_bytes())
        .into_owned()
        .collect();

    let dir_param = params.get("dir").map(|s| s.as_str()).unwrap_or("");
    let file_name = match params.get("file_name") {
        Some(name) if !name.is_empty() => name,
        _ => return Ok(create_error_response(StatusCode::BAD_REQUEST, "缺少必填参数：file_name（文件名）")),
    };

    let safe_file_name = sanitize_filename(file_name);
    if safe_file_name.is_empty() {
        return Ok(create_error_response(StatusCode::BAD_REQUEST, "无效的文件名：file_name"));
    }
    let root_dir = get_sharing_root().await;
    let target_dir = if dir_param.is_empty() {
        (*root_dir).clone()
    } else {
        (*root_dir).join(sanitize_path_segment(dir_param))
    };
    let full_file_path = target_dir.join(safe_file_name);

    let metadata = match tokio::fs::metadata(&full_file_path).await {
        Ok(meta) => meta,
        Err(_) => return Ok(create_error_response(StatusCode::NOT_FOUND, "文件不存在")),
    };
    if !metadata.is_file() {
        return Ok(create_error_response(StatusCode::BAD_REQUEST, "指定路径是目录，不支持预览"));
    }

    let ext = file_ext_lower(file_name);
    if !is_previewable(&ext) {
        return Ok(create_error_response(StatusCode::UNSUPPORTED_MEDIA_TYPE, "该文件类型不支持预览"));
    }

    let encoded_name: String = form_urlencoded::byte_serialize(file_name.as_bytes()).collect();
    let disposition = format!("inline; filename*=UTF-8''{}", encoded_name);

    // 图片 / PDF：直出流式，Content-Length 精确
    if PREVIEW_IMAGE_SUFFIXES.contains(&ext.as_str()) || ext == "pdf" {
        let content_type = mime_guess::from_path(&full_file_path)
            .first_or_octet_stream()
            .to_string();
        return stream_preview_file(full_file_path, metadata.len(), content_type, disposition, None);
    }

    // 纯文本
    if metadata.len() <= PREVIEW_FULL_READ_LIMIT {
        // ≤5MB：全量读取 + 编码检测转码，一次性输出（Content-Length 已知）
        let bytes = match tokio::fs::read(&full_file_path).await {
            Ok(b) => b,
            Err(e) => return Ok(create_error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("文件读取失败：{}", e))),
        };
        let enc = detect_text_encoding(&bytes);
        let (text, _, _) = enc.decode(&bytes);
        let utf8_bytes = text.into_owned().into_bytes();
        let response = Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
            .header(header::CONTENT_DISPOSITION, disposition)
            .header(header::CACHE_CONTROL, "no-store")
            .header(header::CONTENT_LENGTH, utf8_bytes.len().to_string())
            .body(GenericResponseBody::Bytes(utf8_bytes.into()))
            .unwrap();
        return Ok(response);
    }

    // >5MB：读头部定编码后流式（UTF-8 直出带 Content-Length；GBK 流式转码无 Content-Length）
    let mut head = vec![0u8; 8192];
    let mut file = match File::open(&full_file_path).await {
        Ok(f) => f,
        Err(e) => return Ok(create_error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("文件读取失败：{}", e))),
    };
    let read_n = match file.read(&mut head).await {
        Ok(n) => n,
        Err(e) => return Ok(create_error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("文件读取失败：{}", e))),
    };
    let enc = detect_text_encoding(&head[..read_n]);
    if enc == encoding_rs::UTF_8 {
        stream_preview_file(full_file_path, metadata.len(), "text/plain; charset=utf-8".to_string(), disposition, None)
    } else {
        stream_preview_file(full_file_path, metadata.len(), "text/plain; charset=utf-8".to_string(), disposition, Some(enc))
    }
}
```

- [ ] **Step 4: 构建与 lint 验证**

Run: `cargo check 2>&1 | tail -3`、`cargo clippy --all-targets 2>&1 | tail -3`
Expected: 无错误/0 warning。（注意 `Infallible` 在闭包/构造中无需 map_err——若签名提示，调整 builder `.body(...).unwrap()` 与本函数返回 `Result<_, Infallible>` 一致即可）

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/http_server/path_handler/file_sharing_handler.rs
git commit -m "feat: add /preview/file endpoint for inline image/text/PDF preview"
```

---

### Task 4: `FilePreview` 大尺寸浮层组件

**Files:**
- Create: `src-web/src/component/FilePreview/index.jsx`
- Create: `src-web/src/component/FilePreview/FilePreviewStyle.js`

**Interfaces:**
- Consumes: 无
- Produces: `FilePreview({ url, title, onClose })` 默认导出；消耗方（Task 5/6）传递如下 props：
  - `url: string` iframe src
  - `title: string` 展示名
  - `onClose: () => void` 关闭回调（父组件负责置空 state）

- [ ] **Step 1: 创建样式文件**

`FilePreviewStyle.js`：
```js
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
`;

export const PreviewOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.15s ease forwards;
`;

export const PreviewCard = styled.div`
  width: min(80vw, 1200px);
  height: 85vh;
  max-width: 95vw;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: ${scaleIn} 0.15s ease forwards;
`;

export const PreviewToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 44px;
  border-bottom: 1px solid #eee;
  flex: none;
`;

export const PreviewTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const PreviewActions = styled.div`
  display: flex;
  gap: 8px;
  flex: none;
  margin-left: 12px;
`;

export const PreviewButton = styled.button`
  border: 1px solid #ccc;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  &:hover { background: #ebebeb; }
`;

export const PreviewFrame = styled.iframe`
  flex: 1;
  width: 100%;
  border: 0;
  background: #fff;
`;
```

- [ ] **Step 2: 创建组件**

`index.jsx`：
```jsx
import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {PreviewOverlay, PreviewCard, PreviewToolbar, PreviewTitle, PreviewActions, PreviewButton, PreviewFrame} from './FilePreviewStyle';

function FilePreview({url, title, onClose}) {
    const {t} = useTranslation();
    const [reloadKey, setReloadKey] = useState(0);

    // Esc 关闭
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <PreviewOverlay onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <PreviewCard>
                <PreviewToolbar>
                    <PreviewTitle title={title}>{title}</PreviewTitle>
                    <PreviewActions>
                        <PreviewButton data-testid="preview-refresh" onClick={() => setReloadKey(k => k + 1)}>{t('fileSharing.preview.refresh')}</PreviewButton>
                        <PreviewButton onClick={onClose}>{t('fileSharing.preview.close')}</PreviewButton>
                    </PreviewActions>
                </PreviewToolbar>
                <PreviewFrame key={reloadKey} src={url} title={title} />
            </PreviewCard>
        </PreviewOverlay>
    );
}

export default FilePreview;
```

- [ ] **Step 3: 构建验证**

Run: `npm run build 2>&1 | tail -8`（在 `/Users/somunsm/programCode/tauiri/lan-share/src-web`）
Expected: 构建成功（i18n key 在 Task 7 才补齐，此步构建可通过但运行时 key 显示缺失——可临时不验证运行）

- [ ] **Step 4: Commit**

```bash
git add src-web/src/component/FilePreview/
git commit -m "feat: add FilePreview overlay component with iframe support"
```

---

### Task 5: FileSharing 操作列预览按钮接入

**Files:**
- Modify: `src-web/src/component/FileSharing/FileSharing.jsx`

**Interfaces:**
- Consumes: Task 4 的 `FilePreview`；本文件已有 `v.suffix`（`preprocessSharedFileList` 注入）、`getCurrentDir()`
- Produces: `previewUrl` state（`null` 表示关闭）、`isPreviewable(suffix)` 模块级函数（供行内按钮条件）

- [ ] **Step 1: 实现预览判定与状态**

在 `FileSharing.jsx` 的 `fileTypeMap`（L81）之后新增模块级常量与函数：
```js
// 可预览的文本后缀（与后端 PREVIEW_TEXT_SUFFIXES 保持一致）
const PREVIEW_TEXT_SUFFIXES = new Set([
    "txt", "log", "md", "markdown", "csv", "json", "xml", "yaml", "yml",
    "ini", "cfg", "conf", "toml", "env", "html", "htm", "css", "js", "ts",
    "py", "rs", "java", "c", "h", "cpp", "go", "sql",
]);
// 可预览的图片后缀（与后端 PREVIEW_IMAGE_SUFFIXES + pdf 保持一致）
const PREVIEW_IMAGE_SUFFIXES = new Set(["bmp", "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "tiff"]);

const isPreviewable = (suffix) =>
    PREVIEW_IMAGE_SUFFIXES.has(suffix) || suffix === 'pdf' || PREVIEW_TEXT_SUFFIXES.has(suffix);
```

组件内（`diskSpace` state 附近 L135）新增：
```js
// 文件预览浮层 URL（null 表示关闭）
const [previewUrl, setPreviewUrl] = useState(null);
// 正在预览的文件名
const [previewTitle, setPreviewTitle] = useState('');
```
并在 `downloadFile`（L467）旁新增预览打开函数（用 `URLSearchParams` 避免 URL 拼接歧义）：
```js
const openPreview = (v) => {
    if (v.is_dir) return;
    const dir = getCurrentDir();
    const params = new URLSearchParams();
    if (dir) params.set('dir', dir);
    params.set('file_name', v.name);
    setPreviewUrl(`/preview/file?${params.toString()}`);
    setPreviewTitle(v.name);
};
```

- [ ] **Step 2: 操作列插入预览按钮**

在 `FileSharing.jsx` L772（download 按钮）之前插入：
```jsx
{!v.is_dir && isPreviewable(v.suffix) && (
    <button onClick={() => openPreview(v)}>{t('fileSharing.action.preview')}</button>
)}
```

- [ ] **Step 3: 渲染预览浮层**

将组件返回值（L923-926，`})()}` 与 `</FileSharingStyle>` 之间）改为在卡片末尾条件渲染浮层：
```jsx
                })()}
                {previewUrl && (
                    <FilePreview url={previewUrl} title={previewTitle} onClose={() => { setPreviewUrl(null); setPreviewTitle(''); }} />
                )}
            </FileSharingStyle>
```
并在文件顶部 import 区（L10 `beginTask` 之后）追加：
```js
import FilePreview from "../FilePreview/index.jsx";
```

- [ ] **Step 4: 构建与 lint 验证**

Run: `npm run lint` 与 `npm run build`（在 `/Users/somunsm/programCode/tauiri/lan-share/src-web`）
Expected: lint 0 error；构建成功

- [ ] **Step 5: Commit**

```bash
git add src-web/src/component/FileSharing/FileSharing.jsx
git commit -m "feat: add preview button in file sharing table actions"
```

---

### Task 6: TextSharing 图片缩略图左键预览

**Files:**
- Modify: `src-web/src/component/TextSharing/TextSharing.jsx`

**Interfaces:**
- Consumes: Task 4 的 `FilePreview`；图片记录 `v.content` 为 JSON（含 `original_name`/`path`）
- Produces: `previewUrl`/`previewTitle` state

- [ ] **Step 1: 新增状态与 import**

文件顶部（Task 5 同类）：
```js
import FilePreview from "../FilePreview/index.jsx";
```
组件内 `filteredRecords` useMemo 之后：
```js
const [previewUrl, setPreviewUrl] = useState(null);
const [previewTitle, setPreviewTitle] = useState('');
```

- [ ] **Step 2: 缩略图加左键事件**

`TextSharing.jsx` 图片记录 `<img>`（L284-286）修改为：
```jsx
<img src={`/shared-image/${v.id}`}
    alt={meta.original_name || ''}
    className="recordThumb previewableThumb"
    onClick={() => {
        setPreviewUrl(`/shared-image/${v.id}`);
        setPreviewTitle(meta.original_name || v.content || '');
    }} />
```
在 `TextSharingStyle.js`（或对应样式文件）为 `.recordThumb` 增加：
```css
.recordThumb.previewableThumb { cursor: pointer; }
```
（若样式文件无该 class 段落，在现有 `.recordThumb` 规则内追加 `cursor: pointer;` 并保留原 class 名亦可——实现者按现有样式文件补充。）

- [ ] **Step 3: 渲染预览浮层**

组件 return 末尾（`</Card>` 之后、外层闭合前）追加：
```jsx
{previewUrl && (
    <FilePreview url={previewUrl} title={previewTitle} onClose={() => { setPreviewUrl(null); setPreviewTitle(''); }} />
)}
```
需确认 TextSharing 组件根为单一元素：若为单个 Card 包裹，则外层包 `<>...</>`（React Fragment），将 `{previewUrl && ...}` 放在 Fragment 内末尾。

- [ ] **Step 4: 构建与 lint 验证**

Run: `npm run lint` 与 `npm run build`（src-web）
Expected: lint 0 error；构建成功

- [ ] **Step 5: Commit**

```bash
git add src-web/src/component/TextSharing/TextSharing.jsx src-web/src/component/TextSharing/TextSharingStyle.js
git commit -m "feat: open image preview on left click of shared image thumbnails"
```

---

### Task 7: i18n key 补充（zh-CN / en）

**Files:**
- Modify: `src-web/src/locales/zh-CN.json`
- Modify: `src-web/src/locales/en.json`

**Interfaces:**
- Produces: `fileSharing.action.preview`、`fileSharing.preview.refresh`、`fileSharing.preview.close`

- [ ] **Step 1: 先 grep 确认无既有引用**

Run: `grep -rn "fileSharing.preview\|action.preview" src/ src-web/ src-tauri/`
Expected: 无匹配（确认后新增）

- [ ] **Step 2: 写两个 locale**

`zh-CN.json`：`fileSharing.action` 对象内 `download` 键后追加 `"preview": "预览"`；新增 `fileSharing.preview` 对象：
```json
"preview": {
  "refresh": "刷新",
  "close": "关闭"
}
```
`en.json` 对应：
```json
"preview": "Preview"
```
```json
"preview": {
  "refresh": "Refresh",
  "close": "Close"
}
```

- [ ] **Step 3: 构建验证**

Run: `npm run lint` 与 `npm run build`（src-web）
Expected: 通过

- [ ] **Step 4: Commit**

```bash
git add src-web/src/locales/zh-CN.json src-web/src/locales/en.json
git commit -m "feat: add i18n keys for file preview"
```

---

### Task 8: 全局验证与手动验收

**Files:** 无新增/修改

**Interfaces:** 无

- [ ] **Step 1: 全量自动验证**

Run（根目录）：
```bash
cargo check && cargo clippy --all-targets
cd src-web && npm run lint && npm run build && cd ..
npm run build
```
Expected: clippy 0 warning；src-web lint 0 error；两端 build 通过

- [ ] **Step 2: 手动验收清单**

- 局域网对 `根目录/txt(md/log/json)` 文件点预览按钮 → iframe 展示，UTF-8 正常
- 准备一份 **GBK 编码** txt（如 `iconv -f utf-8 -t gbk a.txt -o gbk.txt`）→ 预览显示中文不乱码
- 构造 >5MB 的 GBK 文本（`yes '中文字符测试' | head -3000000 > big.txt` 最省事，再转 GBK）→ 流式预览完整无截断（验证 chunked 正确）
- 图片（png/jpeg 子目录内）→ 预览正常
- PDF（多页）→ 浏览器原生查看器加载、翻页正常
- 非预览类型（docx/exe）→ 不显示预览按钮
- 预览浮层：Esc / 点击遮罩 / 右上角关闭均生效；刷新按钮重载内容
- TextSharing 图片缩略图左键 → 图片预览放大
- 关闭预览浮层后再触发 → 正常
- 端口切换（设置页改端口）后预览 `/preview/file` 无缓存旧内容（no-store 生效）

- [ ] **Step 3: 修复问题并提交（如有）**

若有发现，逐项修复后 `npm run build`/`cargo check` 通过并单独 commit，message 说明修复内容。

---

## Self-Review 结论

- **Spec 覆盖**：端点（T3）、下载消毒（T2）、工具/单测（T1）、组件（T4）、两处入口（T5/T6）、i18n（T7）、三条数据纪律已内化于 T1 的 `transcode_gbk_chunks` 与 T3 的流式分支、验收（T8）——无缺口
- **占位符扫描**：Task 5 Step 1 曾出现的一段有缺陷草案已用"正确实现"替换说明覆盖，其余步骤均含具体代码
- **类型一致性**：`stream_preview_file` 返回 `Result<Response<GenericResponseBody>, Infallible>`，端点内统一 `return stream_preview_file(...)`；`detect_text_encoding` 返回 `&'static Encoding` 供 Task 3 直接与 `encoding_rs::UTF_8` 比较；`file_ext_lower`/`is_previewable` 在端点与测试中签名一致