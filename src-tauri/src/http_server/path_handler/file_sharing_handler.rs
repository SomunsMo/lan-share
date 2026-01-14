//! # 文件共享处理器

use crate::config::config::get_sharing_root;
use crate::http_server::handler::GenericResponseBody;
use crate::http_server::responses::{error, success_json};
use crate::QueryParams;
use form_urlencoded;
use futures_util::stream::TryStreamExt;
use http_body_util::{BodyExt, StreamBody};
use hyper::body::{Body, Bytes, Incoming};
use hyper::{header, Request, Response, StatusCode};
use lan_share_http_macros::{get, post};
use multer::Multipart;
use serde::Serialize;
use std::collections::HashMap;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::time::UNIX_EPOCH;
use std::{fs, io};
use tokio::io::BufReader;

#[derive(Serialize, Debug, Clone)]
// serde指定为untagged是为了去除序列化时value被包到Type中
#[serde(untagged)]
enum FileInfo {
    Bool(bool),     // 用于 is_dir
    U64(u64),       // 用于 modified（时间戳）、size（文件大小）
    String(String), // 用于 name
}

/// 获取共享的文件列表
#[get("/upload/file")]
pub async fn get_file_list(
    _req: Request<Incoming>,
    query_params: QueryParams,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    // 获取 dir 参数，默认为根目录
    let dir_param = query_params.get("dir").map(|s| s.as_str()).unwrap_or("");

    let sharing_root = get_sharing_root();
    let target_dir = if dir_param.is_empty() {
        sharing_root.clone()
    } else {
        // 消毒路径，防止路径遍历攻击
        let safe_path = sanitize_path_segment(dir_param);
        sharing_root.join(safe_path)
    };

    // 验证目录是否存在且是目录
    if !target_dir.exists() || !target_dir.is_dir() {
        return error(
            StatusCode::UNPROCESSABLE_ENTITY,
            &format!(
                "Directory '{}' does not exist or is not a directory",
                target_dir.display()
            ),
        );
    }

    let mut file_list: Vec<HashMap<String, FileInfo>> = Vec::new();

    if let Ok(entries) = fs::read_dir(&target_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                let metadata = match fs::metadata(&path) {
                    Ok(meta) => meta,
                    Err(_) => continue,
                };

                let mut file_info = HashMap::new();
                file_info.insert(
                    "name".to_string(),
                    FileInfo::String(entry.file_name().to_string_lossy().to_string()),
                );

                file_info.insert("is_dir".to_string(), FileInfo::Bool(metadata.is_dir()));

                // 获取修改时间
                if let Ok(modified) = metadata.modified() {
                    if let Ok(duration) = modified.duration_since(UNIX_EPOCH) {
                        let timestamp = duration.as_secs();
                        let formatted_time = crate::utils::datetime::format_datetime(timestamp);
                        file_info.insert("modified".to_string(), FileInfo::String(formatted_time));
                    }
                }

                // 如果是文件，添加文件大小
                if metadata.is_file() {
                    file_info.insert("size".to_string(), FileInfo::U64(metadata.len()));
                } else {
                    file_info.insert("size".to_string(), FileInfo::U64(0));
                }

                file_list.push(file_info);
            }
        }
    }

    // 构建响应
    success_json(file_list)
}

/// 上传被共享的文件
#[post("/upload/file")]
pub async fn upload_file(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    // 解析查询参数
    let query = _req.uri().query().unwrap_or("");
    let params: HashMap<_, _> = form_urlencoded::parse(query.as_bytes())
        .into_owned()
        .collect();

    // 获取 dir 参数，默认为根目录
    let dir_param = params.get("dir").map(|s| s.as_str()).unwrap_or("");

    let headers = _req.headers().clone();

    // 1. 检查 Content-Type
    let content_type = match headers.get(header::CONTENT_TYPE) {
        Some(ct) => match ct.to_str() {
            Ok(s) => s,
            Err(_) => return error(StatusCode::BAD_REQUEST, "Invalid Content-Type header"),
        },
        None => return error(StatusCode::BAD_REQUEST, "Missing Content-Type header"),
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
            trimmed
        }
        None => return error(StatusCode::BAD_REQUEST, "No boundary found"),
    };

    // 3. 处理请求体流（保持不变）
    let body_stream = _req
        .into_body()
        .into_data_stream()
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e));

    let mut multipart = Multipart::new(body_stream, boundary);

    // 4. 定义变量
    let root_dir = get_sharing_root();
    let target_dir = if dir_param.is_empty() {
        root_dir.clone()
    } else {
        // 消毒路径，防止路径遍历攻击
        let safe_path = sanitize_path_segment(dir_param);
        root_dir.join(safe_path)
    };

    // 验证目标目录是否存在且是目录
    if !target_dir.exists() || !target_dir.is_dir() {
        return error(
            StatusCode::UNPROCESSABLE_ENTITY,
            &format!(
                "Directory '{}' does not exist or is not a directory",
                target_dir.display()
            ),
        );
    }

    let mut write_dir: PathBuf = target_dir;
    let mut uploaded: Vec<String> = Vec::new();
    let mut dir_verified = true; // 目标目录已验证

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
                let file_path = write_dir.join(&safe_filename);

                // 直接创建文件并写入（边解析边写，无锁竞争）
                let mut file = match File::create(&file_path) {
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
                            if let Err(e) = file.write_all(&chunk) {
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
                if let Err(e) = file.flush() {
                    return error(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        &format!("Failed to flush file '{}': {}", safe_filename, e),
                    );
                }
                uploaded.push(safe_filename);
            }

            // 忽略其他字段
            _ => continue,
        }
    }

    // 6. 验证上传结果
    if uploaded.is_empty() {
        return error(StatusCode::BAD_REQUEST, "No files uploaded");
    }

    success_json(())
}

/// 验证路径安全性并构建完整路径
fn validate_and_build_path(user_path: &str, filename: &str) -> Result<PathBuf, String> {
    // 消毒路径，只允许字母数字、点、连字符、下划线和正斜杠
    let sanitized_path: String = user_path
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '.' || *c == '-' || *c == '_' || *c == '/')
        .collect();

    // 构建完整路径
    let full_path = PathBuf::from(get_sharing_root())
        .join(&sanitized_path)
        .join(filename);

    // 规范化路径并检查是否试图逃逸根目录
    let normalized_path = full_path.canonicalize().unwrap_or(full_path.clone());
    let root_path = PathBuf::from(get_sharing_root())
        .canonicalize()
        .unwrap_or(PathBuf::from(get_sharing_root()));

    // 检查路径是否在根目录内
    if !normalized_path.starts_with(&root_path) {
        return Err("Invalid path: attempting to access outside root directory".to_string());
    }

    // 检查路径遍历攻击
    if user_path.contains("..") || sanitized_path.contains("..") {
        return Err("Invalid path: '..' is not allowed".to_string());
    }

    // 检查绝对路径
    if user_path.starts_with('/') || user_path.starts_with('\\') {
        return Err("Invalid path: absolute paths are not allowed".to_string());
    }

    // 检查空路径段
    if user_path.contains("//") || sanitized_path.contains("//") {
        return Err("Invalid path: empty path segments are not allowed".to_string());
    }

    Ok(full_path)
}

/// 文件名消毒函数
fn sanitize_filename(filename: &str) -> String {
    filename
        .chars()
        // 只
        .filter(|c| c.is_ascii_alphanumeric() || *c == '.' || *c == '-' || *c == '_')
        .collect()
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
    let root_dir = get_sharing_root();
    let target_dir = if dir_param.is_empty() {
        root_dir.clone()
    } else {
        // 消毒路径，防止路径遍历攻击
        let safe_path = sanitize_path_segment(dir_param);
        root_dir.join(safe_path)
    };
    let full_file_path = target_dir.join(&file_name);

    // 第四步：验证文件合法性
    // 1. 检查文件是否存在
    let metadata = match fs::metadata(&full_file_path) {
        Ok(meta) => meta,
        Err(_) => {
            let error_response = create_error_response(
                StatusCode::NOT_FOUND,
                &format!("文件不存在：{}", full_file_path.display()),
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
    let file_content = match std::fs::read(&full_file_path) {
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

// 创建错误响应，响应体类型为 GenericResponseBody
fn create_error_response(status: StatusCode, msg: &str) -> Response<GenericResponseBody> {
    let res_json = serde_json::json!( {
        "code": status.as_u16(),
        "status": msg
    })
    .to_string();

    let body = GenericResponseBody::String(res_json);

    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "application/json; charset=utf-8")
        .body(body)
        .unwrap()
}
