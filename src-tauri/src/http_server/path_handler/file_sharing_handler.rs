//! # 文件共享处理器

use crate::config::config::get_sharing_root;
use crate::db::dao::config_dao;
use crate::db::dao::upload_dao;
use crate::http_server::handler::GenericResponseBody;
use crate::http_server::responses::{error, success_json};
use crate::http_server::sse::{fire, new_file_deleted, new_file_renamed, new_file_upload};
use crate::QueryParams;
use form_urlencoded;
use futures_util::stream::TryStreamExt;
use http_body_util::BodyExt;
use hyper::body::{Bytes, Incoming};
use hyper::{header, Request, Response, StatusCode};
use lan_share_http_macros::{delete, get, post, put};
use multer::Multipart;
use serde::Serialize;
use std::collections::HashMap;
use std::io;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::time::UNIX_EPOCH;
use tokio::fs;
use tokio::fs::File;
use tokio::io::AsyncReadExt;
use tokio::io::AsyncWriteExt;

#[derive(Serialize)]
struct FileInfoItem {
    name: String,
    is_dir: bool,
    modified: String,
    size: u64,
}

/// 响应结构
#[derive(Serialize)]
struct FileListResponse {
    // 文件列表
    files: Vec<FileInfoItem>,
    // 权限配置
    permissions: WebPermissions,
    // 磁盘空间
    disk_space: DiskSpaceInfo,
}

/// 获取共享的文件列表（含权限配置和磁盘空间信息）
#[get("/upload/file")]
pub async fn get_file_list(
    _req: Request<Incoming>,
    query_params: QueryParams,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    // 检查共享根目录是否已配置
    if !crate::config::config::is_sharing_root_configured() {
        return error(StatusCode::BAD_REQUEST, "未设置共享目录，请让管理员先设置共享目录");
    }

    // 获取 dir 参数，默认为根目录
    let dir_param = query_params.get("dir").map(|s| s.as_str()).unwrap_or("");

    let sharing_root = get_sharing_root().await;
    let target_dir = if dir_param.is_empty() {
        (*sharing_root).clone()
    } else {
        // 消毒路径，防止路径遍历攻击
        let safe_path = sanitize_path_segment(dir_param);
        (*sharing_root).join(safe_path)
    };

    // 验证目录是否存在且是目录
    let metadata_res = tokio::fs::metadata(&target_dir).await;
    match metadata_res {
        Ok(metadata) => {
            if !metadata.is_dir() {
                return error(
                    StatusCode::UNPROCESSABLE_ENTITY,
                    &format!("Path '{}' exists but is not a directory", dir_param),
                );
            }
        }
        Err(_) => {
            return error(
                StatusCode::UNPROCESSABLE_ENTITY,
                &format!("Directory '{}' does not exist", dir_param),
            );
        }
    }

    let mut file_list: Vec<FileInfoItem> = Vec::new();

    let mut entries = match tokio::fs::read_dir(&target_dir).await {
        Ok(entries) => entries,
        Err(_) => {
            return error(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("Failed to read directory: {}", dir_param),
            );
        }
    };

    loop {
        let entry = match entries.next_entry().await {
            Ok(Some(entry)) => entry,
            Ok(None) => break, // 已经读完所有条目
            Err(e) => {
                log::error!("Error reading directory entry: {}", e);
                break;
            }
        };
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();
        let metadata = match tokio::fs::symlink_metadata(&path).await {
            Ok(meta) => meta,
            Err(_) => continue,
        };

        // 检查排除规则
        let filter = crate::config::config::get_exclude_filter().await;
        if filter.compiled_patterns.iter().any(|re| re.is_match(&file_name)) {
            continue;
        }
        drop(filter);

        let modified = metadata
            .modified()
            .ok()
            .and_then(|m| m.duration_since(UNIX_EPOCH).ok())
            .map(|d| crate::utils::datetime::format_datetime(d.as_secs()))
            .unwrap_or_default();

        file_list.push(FileInfoItem {
            name: file_name,
            is_dir: metadata.is_dir(),
            modified,
            size: if metadata.is_file() { metadata.len() } else { 0 },
        });
    }

    // 获取权限配置
    let permissions = fetch_permissions().await;

    // 获取磁盘空间信息
    let disk_space = match fs4::statvfs(&target_dir) {
        Ok(stats) => DiskSpaceInfo {
            total_space: stats.total_space(),
            available_space: stats.available_space(),
        },
        Err(e) => {
            log::error!("获取磁盘空间信息失败: {}", e);
            DiskSpaceInfo {
                total_space: 0,
                available_space: 0,
            }
        }
    };

    // 构建合并响应
    success_json(FileListResponse {
        files: file_list,
        permissions,
        disk_space,
    })
}

/// 上传被共享的文件
#[post("/upload/file")]
pub async fn upload_file(
    _req: Request<Incoming>,
    query_params: QueryParams,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    // 检查上传功能是否启用
    let upload_enabled = match config_dao::get_config_value("upload_enabled").await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(true),
        Ok(None) => false, // 如果配置不存在，默认禁止上传
        Err(_) => false,   // 如果出错，默认禁止上传
    };

    if !upload_enabled {
        return error(StatusCode::FORBIDDEN, "文件上传功能已被禁用");
    }

    // 解析查询参数
    // dir：文件上传到哪目录，默认为根目录
    let dir_param = query_params.get("dir").map(|s| s.as_str()).unwrap_or("");

    // 从 extensions 中获取客户端地址（必须在 into_body() 之前提取）
    let client_ip = _req
        .extensions()
        .get::<SocketAddr>()
        .map(|addr| addr.ip().to_string())
        .unwrap_or_else(|| "Unknown IP".to_string());

    let client_id = _req
        .headers()
        .get("X-Lan-Client-Id")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    // 1. 检查 Content-Type（提取到 String 中以释放 _req 的借用）
    let content_type = match _req.headers().get(header::CONTENT_TYPE)
        .and_then(|ct| ct.to_str().ok())
        .map(|s| s.to_string())
    {
        Some(ct) => ct,
        None => return error(StatusCode::BAD_REQUEST, "Missing or invalid Content-Type header"),
    };

    if !content_type.contains("multipart/form-data") {
        return error(StatusCode::BAD_REQUEST, "Expected multipart/form-data");
    }

    // 2. 提取 boundary
    let boundary = match content_type.split("boundary=").nth(1) {
        Some(b) => {
            let trimmed = b.trim();
            if trimmed.is_empty() {
                return error(StatusCode::BAD_REQUEST, "No boundary found");
            }
            trimmed.to_string()
        }
        None => return error(StatusCode::BAD_REQUEST, "No boundary found"),
    };

    // 检查 Content-Length 和磁盘空间（提取到 String 中以释放 _req 的借用）
    let content_length = _req.headers().get(header::CONTENT_LENGTH)
        .and_then(|cl| cl.to_str().ok())
        .map(|s| s.to_string());

    // 3. 在消费 body 之前完成所有校验
    let root_dir = get_sharing_root().await;
    let target_dir = if dir_param.is_empty() {
        (*root_dir).clone()
    } else {
        let safe_path = sanitize_path_segment(dir_param);
        (*root_dir).join(safe_path)
    };

    // 验证目标目录是否存在且是目录
    let metadata_res = tokio::fs::metadata(&target_dir).await;
    match metadata_res {
        Ok(metadata) => {
            if !metadata.is_dir() {
                return error(
                    StatusCode::UNPROCESSABLE_ENTITY,
                    &format!(
                        "Path '{}' exists but is not a directory",
                        crate::utils::path::normalize_path(&target_dir)
                    ),
                );
            }
        }
        Err(_) => {
            return error(
                StatusCode::UNPROCESSABLE_ENTITY,
                &format!(
                    "Directory '{}' does not exist",
                    crate::utils::path::normalize_path(&target_dir)
                ),
            );
        }
    }

    // 检查 Content-Length 和磁盘空间
    match content_length {
        Some(ref length_str) => {
            if let Ok(upload_size) = length_str.parse::<u64>() {
                if !check_disk_space(upload_size, &target_dir) {
                    return error(
                        StatusCode::INSUFFICIENT_STORAGE,
                        "磁盘剩余空间不足，无法存储上传的文件",
                    );
                }
            }
        }
        None => {
            return error(StatusCode::LENGTH_REQUIRED, "请求缺少 Content-Length 头");
        }
    }

    // 4. 所有校验通过后才消费 body
    let body_stream = _req
        .into_body()
        .into_data_stream()
        .map_err(io::Error::other);

    let mut multipart = Multipart::new(body_stream, boundary);

    let mut uploaded: Vec<String> = Vec::new();
    let mut overwrite_flags: Vec<bool> = Vec::new();

    // 预查询覆盖配置，避免在循环中重复查 DB
    let overwrite_enabled = match config_dao::get_config_value("upload_overwrite_enabled").await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(false),
        _ => false,
    };

    // 5. 核心逻辑：支持任意字段顺序，边解析边上传
    loop {
        let mut field = match multipart.next_field().await {
            Ok(Some(f)) => f,
            Ok(None) => break, // 解析完毕
            Err(e) => {
                return error(
                    StatusCode::BAD_REQUEST,
                    &format!("Multipart parse error: {}", e),
                )
            }
        };

        let field_name = match field.name() {
            Some(name) => name,
            None => return error(StatusCode::BAD_REQUEST, "Missing field name"),
        };

        match field_name {
            "file" => {
                // 获取并清洗文件名
                let filename = match field.file_name() {
                    Some(name) => name.to_string(),
                    None => return error(StatusCode::BAD_REQUEST, "Missing filename"),
                };
                let safe_filename = sanitize_filename(&filename);
                let file_path = target_dir.join(&safe_filename);

                // 检查同名文件是否存在，若存在且上传覆盖已禁用则返回错误
                let file_existed = file_path.exists();
                if file_existed && !overwrite_enabled {
                    return error(
                        StatusCode::CONFLICT,
                        &format!("文件 '{}' 已存在（上传覆盖已禁用）", safe_filename),
                    );
                }

                // 直接创建文件并写入（边解析边写，无锁竞争）
                let mut file = match File::create(&file_path).await {
                    Ok(f) => f,
                    Err(e) => {
                        return error(
                            StatusCode::INTERNAL_SERVER_ERROR,
                            &format!("Failed to create file '{}': {}", safe_filename, e),
                        )
                    }
                };

                // 读取 Field 流并写入（无锁竞争）
                loop {
                    match field.chunk().await {
                        Ok(Some(chunk)) => {
                            if let Err(e) = file.write_all(&chunk).await {
                                // 清理未写完的文件
                                let _ = tokio::fs::remove_file(&file_path).await;
                                // 检查是否是磁盘空间不足
                                if !check_disk_space(1, &target_dir) {
                                    return error(
                                        StatusCode::INSUFFICIENT_STORAGE,
                                        "磁盘剩余空间不足，无法存储上传的文件",
                                    );
                                }
                                return error(
                                    StatusCode::INTERNAL_SERVER_ERROR,
                                    &format!("Failed to write file '{}': {}", safe_filename, e),
                                );
                            }
                        }
                        Ok(None) => break, // 文件写入完毕
                        Err(e) => {
                            return error(
                                StatusCode::BAD_REQUEST,
                                &format!("Failed to read chunk for '{}': {}", safe_filename, e),
                            )
                        }
                    }
                }

                // 刷新并记录上传结果
                if let Err(e) = file.flush().await {
                    let _ = tokio::fs::remove_file(&file_path).await;
                    if !check_disk_space(1, &target_dir) {
                        return error(
                            StatusCode::INSUFFICIENT_STORAGE,
                            "磁盘剩余空间不足，无法存储上传的文件",
                        );
                    }
                    return error(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        &format!("Failed to flush file '{}': {}", safe_filename, e),
                    );
                }
                uploaded.push(safe_filename);
                overwrite_flags.push(file_existed);
            }

            // 忽略其他字段
            _ => continue,
        }
    }

    // 6. 验证上传结果
    if uploaded.is_empty() {
        return error(StatusCode::BAD_REQUEST, "No files uploaded");
    }

    // 7. 将文件上传记录写入数据库
    for (i, filename) in uploaded.iter().enumerate() {
        let file_absolute_path = target_dir.join(filename);
        let absolute_path_str = crate::utils::path::normalize_path(&file_absolute_path);
        let is_overwrite = *overwrite_flags.get(i).unwrap_or(&false);
        if let Err(e) = upload_dao::add(2, &absolute_path_str, None, &client_ip, is_overwrite).await {
            log::error!("记录文件上传历史失败: {}", e);
        }
    }

    for filename in &uploaded {
        fire(new_file_upload(dir_param, filename, client_id.clone()));
    }

    success_json(())
}

// 预览工具（图片/PDF/纯文本/音频/Excel）
const PREVIEW_IMAGE_SUFFIXES: &[&str] = &["bmp", "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "tiff"];
const PREVIEW_TEXT_SUFFIXES: &[&str] = &[
    "txt", "log", "md", "markdown", "csv", "json", "xml", "yaml", "yml",
    "ini", "cfg", "conf", "toml", "env", "html", "htm", "css", "js", "ts",
    "py", "rs", "java", "c", "h", "cpp", "go", "sql",
];
/// 小于该字节数的文本全量读取后转码预览，更大的走流式
const PREVIEW_FULL_READ_LIMIT: u64 = 5 * 1024 * 1024;
/// 浏览器原生可靠播放的音频后缀（wma/ape 等编码不在列）
const PREVIEW_AUDIO_SUFFIXES: &[&str] = &["mp3", "wav", "ogg", "opus", "flac", "m4a", "aac"];
/// Excel 表格后缀（前端 exceljs 解析渲染；仅支持 xlsx，xls 老格式不支持）
const PREVIEW_EXCEL_SUFFIXES: &[&str] = &["xlsx"];
/// Excel 预览上限：超过则拒绝（防御 SheetJS 解析大文件卡顿）
const PREVIEW_EXCEL_MAX_SIZE: u64 = 10 * 1024 * 1024;

/// 取小写扩展名（无扩展名返回空串）
fn file_ext_lower(name: &str) -> String {
    name.rsplit('.').next().unwrap_or("").to_lowercase()
}

/// 该扩展名是否支持预览（图片/PDF/纯文本/音频/Excel）
fn is_previewable(ext: &str) -> bool {
    PREVIEW_IMAGE_SUFFIXES.contains(&ext)
        || ext == "pdf"
        || PREVIEW_TEXT_SUFFIXES.contains(&ext)
        || PREVIEW_AUDIO_SUFFIXES.contains(&ext)
        || PREVIEW_EXCEL_SUFFIXES.contains(&ext)
}

/// 解析单段 Range 请求，返回闭区间 (start, end)。无法满足（非 bytes 单元 / 语法非法 / start 越界 / 空文件）返回 None，上层回退 200 全量。
fn parse_range_header(value: Option<&str>, total: u64) -> Option<(u64, u64)> {
    if total == 0 {
        return None;
    }
    let value = value?.trim().strip_prefix("bytes=")?;
    let (start_s, end_s) = value.split_once('-')?;
    let (start, end) = if start_s.is_empty() {
        let suffix: u64 = end_s.parse().ok()?;
        if suffix == 0 {
            return None;
        }
        let start = total.saturating_sub(suffix);
        (start, total - 1)
    } else {
        let start: u64 = start_s.parse().ok()?;
        let end: u64 = if end_s.is_empty() {
            total - 1
        } else {
            end_s.parse().ok()?
        };
        (start, end)
    };
    if start >= total || start > end {
        return None;
    }
    Some((start, end.min(total - 1)))
}

/// 编码检测：先按 BOM，再尝试 UTF-8 严格解码（无报错视为 UTF-8），否则按 GBK
fn detect_text_encoding(data: &[u8]) -> &'static encoding_rs::Encoding {
    if let Some((enc, _)) = encoding_rs::Encoding::for_bom(data) {
        return enc;
    }
    let (_, had_errors) = encoding_rs::UTF_8.decode_without_bom_handling(data);
    if had_errors { encoding_rs::GBK } else { encoding_rs::UTF_8 }
}

/// 流式 GBK→UTF-8 转码：复用同一 Decoder 跨块缓冲不完整多字节序列（数据正确性纪律 3）
/// 供单测验证跨块解码正确性；产品流式路径在 stream_preview_file 中镜像同款循环（逐块发送，不整包累积）
#[cfg(test)]
fn transcode_gbk_chunks(chunks: &[&[u8]]) -> String {
    use encoding_rs::CoderResult;
    let mut decoder = encoding_rs::GBK.new_decoder();
    let mut out = String::new();
    for (i, chunk) in chunks.iter().enumerate() {
        let last = i == chunks.len() - 1;
        // decode_to_string 以 String 容量为单次输出上限，先按最大输出量预留空间
        if let Some(len) = decoder.max_utf8_buffer_length(chunk.len()) {
            out.reserve(len);
        }
        let mut rest = *chunk;
        loop {
            let (result, consumed, _) = decoder.decode_to_string(rest, &mut out, last);
            rest = &rest[consumed..];
            match result {
                CoderResult::InputEmpty => break,
                CoderResult::OutputFull => {
                    // 容量耗尽时扩容后继续输出剩余字节
                    if let Some(len) = decoder.max_utf8_buffer_length(rest.len()) {
                        out.reserve(len);
                    }
                }
            }
        }
    }
    out
}

/// 文件名消毒函数
/// 根据不同平台排除文件系统危险字符，保留合法的Unicode字符
fn sanitize_filename(filename: &str) -> String {
    // Unix-like 系统仅不允许 / 和 \0
    #[cfg(not(target_os = "windows"))]
    let dangerous_chars = ['/', '\0'];

    // Windows 文件系统不允许的字符: \ / : * ? " < > |
    #[cfg(target_os = "windows")]
    let dangerous_chars = ['\\', '/', ':', '*', '?', '"', '<', '>', '|', '\0'];

    let result_filename = filename
        .chars()
        .filter(|c| !dangerous_chars.contains(c))
        .collect();

    if filename != result_filename {
        log::info!("文件名被处理 [{}] -> [{}]", filename, result_filename);
    }

    result_filename
}

/// 路径段消毒函数，防止路径遍历攻击
fn sanitize_path_segment(path_segment: &str) -> String {
    // 替换 Windows 风格的反斜杠为 Unix 风格的正斜杠，便于统一处理
    let normalized_path = path_segment.replace('\\', "/");

    // 分割路径并处理每个部分
    let parts: Vec<&str> = normalized_path.split('/').collect();
    let mut clean_parts = Vec::new();

    for part in parts {
        if part == ".." {
            // 如果遇到 ".."，则从 clean_parts 中弹出最后一个元素（如果有）
            if !clean_parts.is_empty() {
                clean_parts.pop();
            }
        } else if !part.is_empty() && part != "." {
            // 保留所有字符，包括特殊字符，只排除 ".." 和 "."
            clean_parts.push(part);
        }
    }

    clean_parts.join("/")
}

#[get("/download/file")]
pub async fn download_file(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    // 第一步：解析 GET 查询参数（dir 和 file_name）
    let query = match _req.uri().query() {
        Some(q) => q,
        None => {
            let error_response = create_error_response(
                StatusCode::BAD_REQUEST,
                "缺少查询参数：?dir=目录&file_name=文件名",
            );
            return Ok(error_response);
        }
    };

    // 解析查询参数为 HashMap
    let params: HashMap<_, _> = form_urlencoded::parse(query.as_bytes())
        .into_owned()
        .collect();

    // 第二步：提取并校验必填参数
    // 1. 提取 dir（目录，可为空，为空则直接拼接根目录）
    let dir_param = params.get("dir").map(|s| s.as_str()).unwrap_or("");

    // 2. 提取 file_name（文件名，必填）
    let file_name = match params.get("file_name") {
        Some(name) if !name.is_empty() => name,
        _ => {
            let error_response =
                create_error_response(StatusCode::BAD_REQUEST, "缺少必填参数：file_name（文件名）");
            return Ok(error_response);
        }
    };

    // 第三步：拼接完整文件路径（root_dir + dir + file_name）
    let root_dir = get_sharing_root().await;
    let target_dir = if dir_param.is_empty() {
        (*root_dir).clone()
    } else {
        // 消毒路径，防止路径遍历攻击
        let safe_path = sanitize_path_segment(dir_param);
        (*root_dir).join(safe_path)
    };
    let safe_file_name = sanitize_filename(file_name);
    if safe_file_name.is_empty() {
        return Ok(create_error_response(StatusCode::BAD_REQUEST, "无效的文件名：file_name"));
    }
    let full_file_path = target_dir.join(&safe_file_name);

    // 第四步：验证文件合法性
    // 1. 检查文件是否存在
    let metadata = match tokio::fs::metadata(&full_file_path).await {
        Ok(meta) => meta,
        Err(_) => {
            let error_response = create_error_response(
                StatusCode::NOT_FOUND,
                &format!(
                    "文件不存在：{}",
                    crate::utils::path::normalize_path(&full_file_path)
                ),
            );
            return Ok(error_response);
        }
    };

    // 2. 确保是文件（不是目录）
    if !metadata.is_file() {
        let error_response = create_error_response(
            StatusCode::FORBIDDEN,
            "指定路径是目录，不允许下载，请检查 file_name 参数",
        );
        return Ok(error_response);
    }

    // 第五步：打开文件并读取内容
    let file_content = match tokio::fs::read(&full_file_path).await {
        Ok(content) => content,
        Err(e) => {
            let error_response = create_error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("文件读取失败：{}", e),
            );
            return Ok(error_response);
        }
    };

    // 第六步：构建下载响应
    let response = Response::builder()
        .status(StatusCode::OK)
        // 触发浏览器下载弹窗（文件名使用原始文件名）
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", file_name),
        )
        // 传递文件大小（用于下载进度显示）
        .header(header::CONTENT_LENGTH, metadata.len().to_string())
        // 自动推断 MIME 类型（优化浏览器行为）
        .header(
            header::CONTENT_TYPE,
            mime_guess::from_path(&full_file_path)
                .first_or_octet_stream()
                .to_string(),
        )
        .body(GenericResponseBody::Bytes(file_content.into()))
        .unwrap();

    Ok(response)
}

/// 构造 inline 预览响应：支持直出字节流或 GBK→UTF-8 流式转码
/// transcode 为 Some 时不允许设 Content-Length（输出长度不可预知，走 chunked）；范围请求时不转码
fn stream_preview_file(
    file_path: PathBuf,
    len: u64,
    content_type: String,
    disposition: String,
    range: Option<(u64, u64)>,
    transcode: Option<&'static encoding_rs::Encoding>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let (tx, rx) = tokio::sync::mpsc::channel::<Bytes>(8);
    let range_len = range.map(|(s, e)| e - s + 1);
    tokio::spawn(async move {
        let mut file = match File::open(&file_path).await {
            Ok(f) => f,
            Err(_) => return, // 打开失败直接结束流（客户端将收到网络错误）
        };
        if let Some((s, _)) = range {
            use tokio::io::AsyncSeekExt;
            if file.seek(std::io::SeekFrom::Start(s)).await.is_err() {
                return;
            }
        }
        if let Some(enc) = transcode {
            // 跨块复用同一 Decoder，缓冲不完整多字节序列（数据正确性纪律 3）
            use encoding_rs::CoderResult;
            let mut decoder = enc.new_decoder();
            let mut buf = vec![0u8; 64 * 1024];
            loop {
                match file.read(&mut buf).await {
                    Ok(0) => break,
                    Ok(n) => {
                        // decode_to_string 以 String 容量为单次输出上限，先按最大输出量预留空间
                        let mut out = String::new();
                        if let Some(reserved) = decoder.max_utf8_buffer_length(n) {
                            out.reserve(reserved);
                        }
                        let mut rest = &buf[..n];
                        loop {
                            let (result, consumed, _) = decoder.decode_to_string(rest, &mut out, false);
                            rest = &rest[consumed..];
                            match result {
                                CoderResult::InputEmpty => break,
                                CoderResult::OutputFull => {
                                    // 容量耗尽时扩容后继续输出剩余字节
                                    if let Some(reserved) = decoder.max_utf8_buffer_length(rest.len()) {
                                        out.reserve(reserved);
                                    }
                                }
                            }
                        }
                        if tx.send(Bytes::from(out.into_bytes())).await.is_err() {
                            return; // 客户端已断开
                        }
                    }
                    _ => return,
                }
            }
            // 最后一次（可能为空）flush：last=true 输出解码缓冲残留，保证数据完整（纪律 3）
            // 必须预留容量：残留字节被 flush 为 U+FFFD 时无容量会越界，max_utf8_buffer_length(0)
            // 已按 pending 状态计入该替换字符的余量
            let mut out = String::new();
            if let Some(reserved) = decoder.max_utf8_buffer_length(0) {
                out.reserve(reserved);
            }
            let _ = decoder.decode_to_string(&[], &mut out, true);
            let _ = tx.send(Bytes::from(out.into_bytes())).await;
        } else {
            // 直出原字节流（图片 / PDF / 音频 / UTF-8 文本），Content-Length 精确；range 时只读区间
            let mut buf = vec![0u8; 64 * 1024];
            let mut remaining = range_len.unwrap_or(u64::MAX);
            while remaining > 0 {
                let to_read = buf.len().min(remaining as usize);
                match file.read(&mut buf[..to_read]).await {
                    Ok(0) => break,
                    Ok(n) => {
                        if tx.send(Bytes::copy_from_slice(&buf[..n])).await.is_err() {
                            return;
                        }
                        remaining -= n as u64;
                    }
                    _ => return,
                }
            }
        }
    });

    let mut builder = Response::builder()
        .header(header::CONTENT_TYPE, content_type)
        .header(header::CONTENT_DISPOSITION, disposition)
        // 文件可变，不缓存，避免端口切换后展示旧内容
        .header(header::CACHE_CONTROL, "no-store");
    match range {
        Some((s, e)) => {
            builder = builder
                .status(StatusCode::PARTIAL_CONTENT)
                .header(header::CONTENT_RANGE, format!("bytes {}-{}/{}", s, e, len));
            if transcode.is_none() {
                builder = builder.header(header::CONTENT_LENGTH, range_len.unwrap_or(len).to_string());
            }
        }
        None => {
            builder = builder.status(StatusCode::OK);
            if transcode.is_none() {
                builder = builder.header(header::CONTENT_LENGTH, len.to_string());
            }
        }
    }
    Ok(builder.body(GenericResponseBody::Stream(rx)).unwrap())
}

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

    // 消毒文件名，防止路径遍历攻击
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

    // 图片 / PDF / 音频：直出流式，Content-Length 精确；支持单段 Range（音频拖进度）
    if PREVIEW_IMAGE_SUFFIXES.contains(&ext.as_str()) || ext == "pdf" || PREVIEW_AUDIO_SUFFIXES.contains(&ext.as_str()) {
        let content_type = mime_guess::from_path(&full_file_path)
            .first_or_octet_stream()
            .to_string();
        let range_header = _req.headers().get(header::RANGE).and_then(|v| v.to_str().ok());
        let range = parse_range_header(range_header, metadata.len());
        return stream_preview_file(full_file_path, metadata.len(), content_type, disposition, range, None);
    }

    // Excel（xlsx）：限制 ≤10MB，直出流式，前端 exceljs 全量 fetch 解析
    if PREVIEW_EXCEL_SUFFIXES.contains(&ext.as_str()) {
        if metadata.len() > PREVIEW_EXCEL_MAX_SIZE {
            return Ok(create_error_response(StatusCode::PAYLOAD_TOO_LARGE, "Excel 文件过大，请下载后查看"));
        }
        return stream_preview_file(
            full_file_path,
            metadata.len(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".to_string(),
            disposition,
            None,
            None,
        );
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
        stream_preview_file(
            full_file_path,
            metadata.len(),
            "text/plain; charset=utf-8".to_string(),
            disposition,
            parse_range_header(_req.headers().get(header::RANGE).and_then(|v| v.to_str().ok()), metadata.len()),
            None,
        )
    } else {
        stream_preview_file(full_file_path, metadata.len(), "text/plain; charset=utf-8".to_string(), disposition, None, Some(enc))
    }
}

// 创建错误响应，响应体类型为 GenericResponseBody
fn create_error_response(status: StatusCode, msg: &str) -> Response<GenericResponseBody> {
    let res_json = serde_json::json!( {
        "code": status.as_u16(),
        "msg": msg
    })
    .to_string();

    let body = GenericResponseBody::String(res_json);

    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "application/json; charset=utf-8")
        .body(body)
        .unwrap()
}

/// 重命名文件或文件夹
#[put("/rename/file")]
pub async fn rename_file(
    _req: Request<Incoming>,
    query_params: QueryParams,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    // 解析查询参数
    let dir_param = query_params.get("dir").map(|s| s.as_str()).unwrap_or("");
    let old_name = match query_params.get("old_name") {
        Some(name) if !name.is_empty() => name.clone(),
        _ => return error(StatusCode::BAD_REQUEST, "缺少必填参数：old_name"),
    };
    let new_name = match query_params.get("new_name") {
        Some(name) if !name.is_empty() => name.clone(),
        _ => return error(StatusCode::BAD_REQUEST, "缺少必填参数：new_name"),
    };

    // 消毒新文件名
    let safe_new_name = sanitize_filename(&new_name);
    if safe_new_name.is_empty() {
        return error(StatusCode::BAD_REQUEST, "新文件名不合法");
    }

    let client_id = _req
        .headers()
        .get("X-Lan-Client-Id")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    // 拼接路径
    let root_dir = get_sharing_root().await;
    let target_dir = if dir_param.is_empty() {
        (*root_dir).clone()
    } else {
        let safe_path = sanitize_path_segment(dir_param);
        (*root_dir).join(safe_path)
    };

    let old_path = target_dir.join(sanitize_filename(&old_name));
    let new_path = target_dir.join(&safe_new_name);

    // 验证原文件/文件夹存在
    if !old_path.exists() {
        return error(
            StatusCode::NOT_FOUND,
            &format!("文件或文件夹不存在：{}", old_name),
        );
    }

    // 按文件/文件夹检查重命名权限
    let is_dir = old_path.is_dir();
    let perm_key = if is_dir { "rename_folder_enabled" } else { "rename_file_enabled" };
    let perm_label = if is_dir { "文件夹" } else { "文件" };
    let rename_allowed = match config_dao::get_config_value(perm_key).await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(false),
        Ok(None) => false,
        Err(_) => false,
    };
    if !rename_allowed {
        return error(
            StatusCode::FORBIDDEN,
            &format!("{}重命名功能已被禁用", perm_label),
        );
    }

    // 验证新名称不存在
    if new_path.exists() {
        return error(
            StatusCode::CONFLICT,
            &format!("目标名称已存在：{}", safe_new_name),
        );
    }

    // 执行重命名
    match fs::rename(&old_path, &new_path).await {
        Ok(_) => {
            log::info!("重命名成功: {} -> {}", old_name, safe_new_name);
            fire(new_file_renamed(
                dir_param,
                &sanitize_filename(&old_name),
                &safe_new_name,
                client_id,
            ));
            success_json(())
        }
        Err(e) => {
            log::error!("重命名失败: {}", e);
            error(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("重命名失败：{}", e),
            )
        }
    }
}

/// 删除文件或文件夹
#[delete("/delete/file")]
pub async fn delete_file(
    _req: Request<Incoming>,
    query_params: QueryParams,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    // 解析查询参数
    let dir_param = query_params.get("dir").map(|s| s.as_str()).unwrap_or("");
    let file_name = match query_params.get("file_name") {
        Some(name) if !name.is_empty() => name.clone(),
        _ => return error(StatusCode::BAD_REQUEST, "缺少必填参数：file_name"),
    };

    let client_id = _req
        .headers()
        .get("X-Lan-Client-Id")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    // 拼接路径
    let root_dir = get_sharing_root().await;
    let target_dir = if dir_param.is_empty() {
        (*root_dir).clone()
    } else {
        let safe_path = sanitize_path_segment(dir_param);
        (*root_dir).join(safe_path)
    };

    let safe_filename = sanitize_filename(&file_name);
    let file_path = target_dir.join(&safe_filename);

    // 验证文件/文件夹存在
    let metadata = match tokio::fs::metadata(&file_path).await {
        Ok(meta) => meta,
        Err(_) => {
            return error(
                StatusCode::NOT_FOUND,
                &format!("文件或文件夹不存在：{}", safe_filename),
            );
        }
    };

    // 按文件/文件夹检查删除权限
    let perm_key = if metadata.is_dir() { "delete_folder_enabled" } else { "delete_file_enabled" };
    let perm_label = if metadata.is_dir() { "文件夹" } else { "文件" };
    let delete_allowed = match config_dao::get_config_value(perm_key).await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(false),
        Ok(None) => false,
        Err(_) => false,
    };
    if !delete_allowed {
        return error(
            StatusCode::FORBIDDEN,
            &format!("{}删除功能已被禁用", perm_label),
        );
    }

    // 检查是否启用回收站
    let use_trash = match config_dao::get_config_value("delete_to_trash").await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(true),
        Ok(None) => true,
        Err(_) => true,
    };

    // 执行删除
    let result = if use_trash {
        let f_path = file_path.clone();
        match tokio::task::spawn_blocking(move || trash::delete(&f_path)).await {
            Ok(Ok(())) => Ok(()),
            Ok(Err(e)) => Err(std::io::Error::other(e.to_string())),
            Err(e) => Err(std::io::Error::other(e.to_string())),
        }
    } else if metadata.is_dir() {
        fs::remove_dir_all(&file_path).await
    } else {
        fs::remove_file(&file_path).await
    };

    match result {
        Ok(_) => {
            log::info!("删除成功: {}", safe_filename);
            fire(new_file_deleted(dir_param, &safe_filename, client_id));
            success_json(())
        }
        Err(e) => {
            log::error!("删除失败: {}", e);
            error(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("删除失败：{}", e),
            )
        }
    }
}

/// 网页端权限配置
#[derive(Serialize)]
struct WebPermissions {
    upload_enabled: bool,
    rename_file_enabled: bool,
    rename_folder_enabled: bool,
    delete_file_enabled: bool,
    delete_folder_enabled: bool,
    upload_overwrite_enabled: bool,
}

/// 获取权限配置（内部辅助函数）
async fn fetch_permissions() -> WebPermissions {
    let keys = &[
        "upload_enabled",
        "rename_file_enabled",
        "rename_folder_enabled",
        "delete_file_enabled",
        "delete_folder_enabled",
        "upload_overwrite_enabled",
    ];
    let configs = config_dao::get_config_values(keys).await;

    WebPermissions {
        upload_enabled: configs.get("upload_enabled").map(|v| v == "true").unwrap_or(false),
        rename_file_enabled: configs.get("rename_file_enabled").map(|v| v == "true").unwrap_or(false),
        rename_folder_enabled: configs.get("rename_folder_enabled").map(|v| v == "true").unwrap_or(false),
        delete_file_enabled: configs.get("delete_file_enabled").map(|v| v == "true").unwrap_or(false),
        delete_folder_enabled: configs.get("delete_folder_enabled").map(|v| v == "true").unwrap_or(false),
        upload_overwrite_enabled: configs.get("upload_overwrite_enabled").map(|v| v == "true").unwrap_or(false),
    }
}

/// 上传前检测：获取文件是否存在、上传功能、覆盖权限、磁盘剩余空间
#[derive(Serialize)]
struct PreUploadCheck {
    exists: bool,
    upload_enabled: bool,
    overwrite_enabled: bool,
    /// 目标目录所在磁盘的剩余空间（字节），0 表示无法获取
    available_space: u64,
}

#[get("/upload/file/check")]
pub async fn pre_upload_check(
    _req: Request<Incoming>,
    query_params: QueryParams,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let dir_param = query_params.get("dir").map(|s| s.as_str()).unwrap_or("");
    let file_name = match query_params.get("file_name") {
        Some(name) if !name.is_empty() => name.clone(),
        _ => return error(StatusCode::BAD_REQUEST, "缺少必填参数：file_name"),
    };

    let root_dir = get_sharing_root().await;
    let target_dir = if dir_param.is_empty() {
        (*root_dir).clone()
    } else {
        let safe_path = sanitize_path_segment(dir_param);
        (*root_dir).join(safe_path)
    };

    let safe_filename = sanitize_filename(&file_name);
    let file_path = target_dir.join(&safe_filename);

    let exists = file_path.exists();

    let perm_configs = config_dao::get_config_values(&["upload_overwrite_enabled", "upload_enabled"]).await;

    let available_space = fs4::available_space(&target_dir).unwrap_or(0);

    success_json(PreUploadCheck {
        exists,
        upload_enabled: perm_configs.get("upload_enabled").map(|v| v == "true").unwrap_or(false),
        overwrite_enabled: perm_configs.get("upload_overwrite_enabled").map(|v| v == "true").unwrap_or(false),
        available_space,
    })
}

/// 磁盘空间信息
#[derive(Serialize)]
struct DiskSpaceInfo {
    total_space: u64,
    available_space: u64,
}

/// 检查磁盘剩余空间是否足够容纳指定大小的文件
/// 返回 true 表示空间充足，false 表示空间不足
fn check_disk_space(upload_size: u64, target_dir: &std::path::Path) -> bool {
    match fs4::available_space(target_dir) {
        Ok(available) => upload_size <= available,
        Err(e) => {
            log::error!("无法获取磁盘可用空间: {}", e);
            false // 无法确认空间充足时，拒绝上传（安全优先）
        }
    }
}

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

    #[test]
    fn range_header_parsing() {
        assert_eq!(parse_range_header(Some("bytes=0-99"), 1000), Some((0, 99)));
        assert_eq!(parse_range_header(Some("bytes=100-"), 1000), Some((100, 999)));
        assert_eq!(parse_range_header(Some("bytes=-50"), 1000), Some((950, 999)));
        assert_eq!(parse_range_header(Some("bytes=-0"), 1000), None);
        assert_eq!(parse_range_header(None, 1000), None);
        assert_eq!(parse_range_header(Some("bytes=5000-"), 1000), None);
        assert_eq!(parse_range_header(Some("bytes=10-5"), 1000), None);
        assert_eq!(parse_range_header(Some("items=0-9"), 1000), None);
    }

    #[test]
    fn audio_extensions_previewable() {
        for ext in PREVIEW_AUDIO_SUFFIXES {
            assert!(is_previewable(ext), "音频后缀应可预览: {}", ext);
        }
        assert!(!is_previewable("wma"));
        assert!(!is_previewable("ape"));
    }

    #[test]
    fn excel_extensions_previewable() {
        for ext in PREVIEW_EXCEL_SUFFIXES {
            assert!(is_previewable(ext), "Excel 后缀应可预览: {}", ext);
        }
        assert!(!is_previewable("xls"));
        assert!(!is_previewable("docx"));
        assert_eq!(PREVIEW_EXCEL_MAX_SIZE, 10 * 1024 * 1024);
    }

    #[test]
    fn streaming_flush_handles_trailing_lead_byte() {
        use encoding_rs::CoderResult;
        fn run_stream(chunks: &[&[u8]]) -> String {
            let mut decoder = encoding_rs::GBK.new_decoder();
            let mut out_chunks: Vec<String> = Vec::new();
            for chunk in chunks {
                let mut out = String::new();
                if let Some(r) = decoder.max_utf8_buffer_length(chunk.len()) {
                    out.reserve(r);
                }
                let mut rest = *chunk;
                loop {
                    let (result, consumed, _) = decoder.decode_to_string(rest, &mut out, false);
                    rest = &rest[consumed..];
                    match result {
                        CoderResult::InputEmpty => break,
                        CoderResult::OutputFull => {
                            if let Some(r) = decoder.max_utf8_buffer_length(rest.len()) {
                                out.reserve(r);
                            }
                        }
                    }
                }
                out_chunks.push(out);
            }
            let mut out = String::new();
            if let Some(r) = decoder.max_utf8_buffer_length(0) {
                out.reserve(r);
            }
            let _ = decoder.decode_to_string(&[], &mut out, true);
            out_chunks.push(out);
            out_chunks.concat()
        }
        let (gbk, _, _) = encoding_rs::GBK.encode("中文本尾");
        let gbk = gbk.into_owned();
        // 末块以孤立 lead 字节结尾（GBK 双字节序列被切断），flush 应输出替换字符且不 panic
        let mut truncated = gbk.clone();
        truncated.push(0x81u8);
        let flushed = run_stream(&[&truncated[..3], &truncated[3..]]);
        assert!(
            flushed.ends_with('\u{FFFD}'),
            "尾随 lead 字节应被 flush 为替换字符，实际尾部: {:?}",
            flushed.chars().last()
        );
        // 正常整块场景：不产生多余替换字符
        assert_eq!(run_stream(&[&gbk[..4], &gbk[4..]]), "中文本尾");
    }
}
