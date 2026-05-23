//! # 文件共享处理器

use crate::config::config::get_sharing_root;
use crate::db::dao::config_dao;
use crate::db::dao::upload_dao;
use crate::http_server::handler::GenericResponseBody;
use crate::http_server::responses::{error, success_json};
use crate::QueryParams;
use form_urlencoded;
use futures_util::stream::TryStreamExt;
use http_body_util::BodyExt;
use hyper::body::Incoming;
use hyper::{header, Request, Response, StatusCode};
use lan_share_http_macros::{delete, get, post, put};
use log;
use multer::Multipart;
use serde::Serialize;
use std::collections::HashMap;
use std::io;
use std::net::SocketAddr;
use std::time::UNIX_EPOCH;
use tokio::fs;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

#[derive(Serialize, Debug, Clone)]
// serde指定为untagged是为了去除序列化时value被包到Type中
#[serde(untagged)]
enum FileInfo {
    Bool(bool),     // 用于 is_dir
    U64(u64),       // 用于 modified（时间戳）、size（文件大小）
    String(String), // 用于 name
}

/// 响应结构
#[derive(Serialize)]
struct FileListResponse {
    // 文件列表
    files: Vec<HashMap<String, FileInfo>>,
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

    let mut file_list: Vec<HashMap<String, FileInfo>> = Vec::new();

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
        let metadata = match tokio::fs::symlink_metadata(&path).await {
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
        // metadata.modified() 实际上是访问内存中的元数据，不是磁盘I/O操作
        // 因此即使在异步函数中也是安全的
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

    let headers = _req.headers().clone();

    // 从 extensions 中获取客户端地址（必须在 into_body() 之前提取）
    let client_ip = _req
        .extensions()
        .get::<SocketAddr>()
        .map(|addr| addr.ip().to_string())
        .unwrap_or_else(|| "Unknown IP".to_string());

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
                    &format!("Path '{}' exists but is not a directory", crate::utils::path::normalize_path(&target_dir)),
                );
            }
        }
        Err(_) => {
            return error(
                StatusCode::UNPROCESSABLE_ENTITY,
                &format!("Directory '{}' does not exist", crate::utils::path::normalize_path(&target_dir)),
            );
        }
    }

    // 检查 Content-Length 和磁盘空间
    match headers.get(header::CONTENT_LENGTH) {
        Some(content_length) => {
            if let Ok(length_str) = content_length.to_str() {
                if let Ok(upload_size) = length_str.parse::<u64>() {
                    if !check_disk_space(upload_size, &target_dir) {
                        return error(StatusCode::INSUFFICIENT_STORAGE, "磁盘剩余空间不足，无法存储上传的文件");
                    }
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
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e));

    let mut multipart = Multipart::new(body_stream, boundary);

    let mut uploaded: Vec<String> = Vec::new();
    let mut overwrite_flags: Vec<bool> = Vec::new();

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
                if file_existed {
                    let overwrite_enabled =
                        match config_dao::get_config_value("upload_overwrite_enabled").await {
                            Ok(Some(value)) => value.parse::<bool>().unwrap_or(false),
                            _ => false,
                        };
                    if !overwrite_enabled {
                        return error(
                            StatusCode::CONFLICT,
                            &format!("文件 '{}' 已存在（上传覆盖已禁用）", safe_filename),
                        );
                    }
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
        if let Err(e) = upload_dao::add(2, &absolute_path_str, &client_ip, is_overwrite).await {
            log::error!("记录文件上传历史失败: {}", e);
        }
    }

    success_json(())
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
    let full_file_path = target_dir.join(&file_name);

    // 第四步：验证文件合法性
    // 1. 检查文件是否存在
    let metadata = match tokio::fs::metadata(&full_file_path).await {
        Ok(meta) => meta,
        Err(_) => {
            let error_response = create_error_response(
                StatusCode::NOT_FOUND,
                &format!("文件不存在：{}", crate::utils::path::normalize_path(&full_file_path)),
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
    // 检查重命名功能是否启用
    let rename_enabled = match config_dao::get_config_value("rename_enabled").await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(false),
        Ok(None) => false,
        Err(_) => false,
    };

    if !rename_enabled {
        return error(StatusCode::FORBIDDEN, "文件重命名功能已被禁用");
    }

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
    // 检查删除功能是否启用
    let delete_enabled = match config_dao::get_config_value("delete_enabled").await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(false),
        Ok(None) => false,
        Err(_) => false,
    };

    if !delete_enabled {
        return error(StatusCode::FORBIDDEN, "文件删除功能已被禁用");
    }

    // 解析查询参数
    let dir_param = query_params.get("dir").map(|s| s.as_str()).unwrap_or("");
    let file_name = match query_params.get("file_name") {
        Some(name) if !name.is_empty() => name.clone(),
        _ => return error(StatusCode::BAD_REQUEST, "缺少必填参数：file_name"),
    };

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

    // 执行删除
    let result = if metadata.is_dir() {
        fs::remove_dir_all(&file_path).await
    } else {
        fs::remove_file(&file_path).await
    };

    match result {
        Ok(_) => {
            log::info!("删除成功: {}", safe_filename);
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
    rename_enabled: bool,
    delete_enabled: bool,
    upload_overwrite_enabled: bool,
}

/// 获取权限配置（内部辅助函数）
async fn fetch_permissions() -> WebPermissions {
    let upload_enabled = match config_dao::get_config_value("upload_enabled").await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(false),
        _ => false,
    };
    let rename_enabled = match config_dao::get_config_value("rename_enabled").await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(false),
        _ => false,
    };
    let delete_enabled = match config_dao::get_config_value("delete_enabled").await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(false),
        _ => false,
    };
    let upload_overwrite_enabled =
        match config_dao::get_config_value("upload_overwrite_enabled").await {
            Ok(Some(value)) => value.parse::<bool>().unwrap_or(false),
            _ => false,
        };

    WebPermissions {
        upload_enabled,
        rename_enabled,
        delete_enabled,
        upload_overwrite_enabled,
    }
}

/// 文件存在性检查响应
#[derive(Serialize)]
struct FileExistCheck {
    exists: bool,
    upload_enabled: bool,
    overwrite_enabled: bool,
}

/// 检查文件是否存在，并返回是否允许覆盖上传
#[get("/upload/file/exists")]
pub async fn check_file_exists(
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

    let overwrite_enabled = match config_dao::get_config_value("upload_overwrite_enabled").await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(false),
        _ => false,
    };

    let upload_enabled = match config_dao::get_config_value("upload_enabled").await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(false),
        _ => false,
    };

    success_json(FileExistCheck {
        exists,
        upload_enabled,
        overwrite_enabled,
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
            log::warn!("无法获取磁盘可用空间: {}", e);
            true
        }
    }
}
