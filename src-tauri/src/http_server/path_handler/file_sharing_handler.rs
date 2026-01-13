//! # 文件共享处理器

use crate::config::config::get_sharing_root;
use crate::http_server::responses::{error, success};
use crate::QueryParams;
use form_urlencoded;
use futures_util::stream::TryStreamExt;
use http_body_util::{BodyExt, StreamBody};
use hyper::body::{Body, Incoming};
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
) -> Result<Response<String>, std::convert::Infallible> {
    // 获取 dir 参数，默认为根目录
    let dir_param = query_params.get("dir").map(|s| s.as_str()).unwrap_or("");

    // let sharing_root = get_sharing_root();
    let sharing_root = &PathBuf::from("F:/");
    let target_dir = if dir_param.is_empty() {
        sharing_root.clone()
    } else {
        // TODO 这里要防止访问到上级目录！！！
        // 如 ../ / ~

        sharing_root.join(dir_param)
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
    success(file_list)
}

/// 上传被共享的文件
#[post("/upload/file")]
pub async fn upload_file(
    _req: Request<Incoming>,
) -> Result<Response<String>, std::convert::Infallible> {
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
        root_dir.join(dir_param)
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

    success(())
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

// #[get("/download/file")]
// pub async fn download_file(
//     _req: Request<Incoming>,
// ) -> Result<Response<String>, std::convert::Infallible> {
//     // 第一步：解析 GET 查询参数（sub_dir 和 file_name）
//     let query = match _req.uri().query() {
//         Some(q) => q,
//         None => {
//             return error(
//                 StatusCode::BAD_REQUEST,
//                 "缺少查询参数：?sub_dir=子目录&file_name=文件名",
//             )
//         }
//     };
//
//     // 解析查询参数为 HashMap
//     let params: HashMap<_, _> = form_urlencoded::parse(query.as_bytes())
//         .into_owned()
//         .collect();
//
//     // 第二步：提取并校验必填参数
//     // 1. 提取 sub_dir（子目录，可为空，为空则直接拼接根目录）
//     let sub_dir = params
//         .get("sub_dir")
//         // .map(|s| sanitize_path_segment(s))
//         .unwrap();
//
//     // 2. 提取 file_name（文件名，必填）
//     let file_name = match params.get("file_name") {
//         // Some(name) if !name.is_empty() => sanitize_path_segment(name),
//         Some(name) if !name.is_empty() => name,
//         _ => return error(StatusCode::BAD_REQUEST, "缺少必填参数：file_name（文件名）"),
//     };
//
//     // 第三步：拼接完整文件路径（root_dir + sub_dir + file_name）
//     let root_dir = get_sharing_root();
//     let full_file_path = if sub_dir.is_empty() {
//         // 无 sub_dir 时：root_dir / file_name
//         root_dir.join(&file_name)
//     } else {
//         // 有 sub_dir 时：root_dir / sub_dir / file_name
//         root_dir.join(sub_dir).join(&file_name)
//     };
//
//     // 第四步：验证文件合法性
//     // 1. 检查文件是否存在
//     let metadata = match fs::metadata(&full_file_path) {
//         Ok(meta) => meta,
//         Err(_) => {
//             return error(
//                 StatusCode::NOT_FOUND,
//                 &format!("文件不存在：{}", full_file_path.display()),
//             )
//         }
//     };
//
//     // 2. 确保是文件（不是目录）
//     if !metadata.is_file() {
//         return error(
//             StatusCode::FORBIDDEN,
//             "指定路径是目录，不允许下载，请检查 file_name 参数",
//         );
//     }
//
//     // 第五步：打开文件（异步流式读取）
//     let file = match File::open(&full_file_path) {
//         Ok(f) => f,
//         Err(e) => {
//             return error(
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 &format!("文件打开失败：{}", e),
//             )
//         }
//     };
//
//     // 第六步：构建下载响应
//     let response = Response::builder()
//         .status(StatusCode::OK)
//         // 触发浏览器下载弹窗（文件名使用清洗后的原始文件名）
//         .header(
//             header::CONTENT_DISPOSITION,
//             format!("attachment; filename=\"{}\"", file_name),
//         )
//         // 传递文件大小（用于下载进度显示）
//         .header(header::CONTENT_LENGTH, metadata.len().to_string())
//         // 自动推断 MIME 类型（优化浏览器行为）
//         .header(
//             header::CONTENT_TYPE,
//             mime_guess::from_path(&full_file_path)
//                 .first_or_octet_stream()
//                 .to_string(),
//         )
//         // 流式响应体（支持大文件，无内存溢出）
//         // .body(StreamBody::new(file))
//         .body("123".to_string())
//         .unwrap();
//
//     Ok(response)
// }
