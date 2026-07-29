use crate::config::config::get_image_sharing_dir;
use crate::db::dao::upload_dao;
use crate::http_server::handler::GenericResponseBody;
use crate::http_server::responses::{error, success_json};
use http_body_util::BodyExt;
use hyper::body::Incoming;
use hyper::{header, Request, Response, StatusCode};
use lan_share_http_macros::{get, post};
use mime_guess;
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::net::SocketAddr;

#[derive(Serialize)]
struct UploadImageResponse {
    id: i64,
    path: String,
    original_name: String,
    sha256: String,
    size: i64,
}

#[get("/shared-image/{id}")]
pub async fn serve_shared_image(
    req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    log::info!("serve_shared_image 被调用");

    let path = req.uri().path().trim_end_matches('/');
    let id_str = match path.rsplit('/').next() {
        Some(s) if !s.is_empty() => s,
        _ => return error(StatusCode::BAD_REQUEST, "缺少 'id' 参数"),
    };

    let id: i64 = match id_str.parse() {
        Ok(id) => id,
        Err(_) => return error(StatusCode::BAD_REQUEST, "无效的 'id' 参数"),
    };

    let record = match upload_dao::get_by_id(id).await {
        Ok(Some(record)) => record,
        Ok(None) => return error(StatusCode::NOT_FOUND, "图片记录不存在"),
        Err(_) => return error(StatusCode::INTERNAL_SERVER_ERROR, "查询图片记录失败"),
    };

    let content_json: Value = match serde_json::from_str(&record.content) {
        Ok(value) => value,
        Err(e) => {
            log::error!("解析图片记录 content 失败: {}", e);
            return error(StatusCode::INTERNAL_SERVER_ERROR, "图片记录数据异常");
        }
    };

    let file_name = match content_json.get("path").and_then(|v| v.as_str()) {
        Some(p) => p,
        None => return error(StatusCode::INTERNAL_SERVER_ERROR, "图片路径缺失"),
    };

    let save_dir = get_image_sharing_dir().await;
    let full_path = save_dir.join(file_name);

    log::debug!("提供图片: {:?}", full_path);

    let file_bytes = match tokio::fs::read(&full_path).await {
        Ok(bytes) => bytes,
        Err(e) => {
            log::error!("读取图片文件失败 {}: {:?}", full_path.display(), e);
            return error(StatusCode::NOT_FOUND, "图片文件不存在");
        }
    };

    log::info!("图片文件大小: {} 字节", file_bytes.len());

    let original_name = content_json
        .get("original_name")
        .and_then(|v| v.as_str())
        .unwrap_or("image.png");

    let content_type = mime_guess::from_path(original_name)
        .first_or_octet_stream()
        .to_string();

    let encoded_name: String = form_urlencoded::byte_serialize(original_name.as_bytes()).collect();
    let disposition = format!("inline; filename*=UTF-8''{}", encoded_name);

    let body = GenericResponseBody::FileData(file_bytes);
    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, content_type)
        .header(header::CONTENT_DISPOSITION, disposition)
        .header(header::CACHE_CONTROL, "public, max-age=31536000, immutable")
        .body(body)
        .unwrap();

    Ok(response)
}

/// Web 端上传共享图片
#[post("/upload/image")]
pub async fn upload_image(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let client_ip = _req
        .extensions()
        .get::<SocketAddr>()
        .map(|addr| addr.ip().to_string())
        .unwrap_or_else(|| "Unknown IP".to_string());

    let collected_body = match _req.into_body().collect().await {
        Ok(collected) => collected,
        Err(e) => return error(StatusCode::BAD_REQUEST, &format!("读取请求体失败: {}", e)),
    };
    let body_bytes = collected_body.to_bytes();

    if body_bytes.is_empty() {
        return error(StatusCode::BAD_REQUEST, "请求体为空");
    }

    let img = match image::load_from_memory(&body_bytes) {
        Ok(img) => img,
        Err(e) => return error(StatusCode::BAD_REQUEST, &format!("解码图片失败: {}", e)),
    };
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();
    let rgba_bytes = rgba.into_raw();

    let mut hasher = Sha256::new();
    hasher.update(&rgba_bytes);
    let sha256_hash = format!("{:x}", hasher.finalize());

    let img = match image::RgbaImage::from_raw(width, height, rgba_bytes) {
        Some(img) => img,
        None => return error(StatusCode::INTERNAL_SERVER_ERROR, "创建图片缓冲失败"),
    };
    let mut png_bytes = Vec::new();
    if let Err(e) = img.write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageFormat::Png)
    {
        return error(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("PNG编码失败: {}", e),
        );
    }
    let size = png_bytes.len() as i64;

    if let Ok(Some(existing)) = upload_dao::find_image_by_sha256_size(&sha256_hash, size).await {
        log::info!("发现重复图片 ID={}，刷新时间", existing.id);
        if let Err(e) = upload_dao::bump_record(existing.id).await {
            log::error!("刷新记录失败: {}", e);
        }
        if let Ok(content_json) = serde_json::from_str::<Value>(&existing.content) {
            return success_json(UploadImageResponse {
                id: existing.id,
                path: content_json
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                original_name: content_json
                    .get("original_name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                sha256: sha256_hash,
                size,
            });
        }
    }

    let save_dir = get_image_sharing_dir().await.clone();
    if let Err(e) = tokio::fs::create_dir_all(&save_dir).await {
        return error(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("创建目录失败: {}", e),
        );
    }

    let file_name = format!("lans_{}.png", sha256_hash);
    let save_path = save_dir.join(&file_name);

    if !save_path.exists() {
        if let Err(e) = tokio::fs::write(&save_path, &png_bytes).await {
            return error(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("写入PNG文件失败: {}", e),
            );
        }
        log::info!("图片已保存至: {:?}", save_path);
    }

    let id = match upload_dao::add(5, "{}", None, &client_ip, false).await {
        Ok(id) => id,
        Err(e) => {
            log::error!("插入记录失败: {}", e);
            return error(StatusCode::INTERNAL_SERVER_ERROR, "插入记录失败");
        }
    };

    let content_json = serde_json::json!({
        "path": file_name,
        "original_name": file_name,
        "sha256": sha256_hash,
        "size": size
    });

    if let Err(e) = upload_dao::update_content(id, &content_json.to_string()).await {
        log::error!("更新记录内容失败: {}", e);
    }

    log::info!("图片记录已创建, ID={}", id);

    success_json(UploadImageResponse {
        id,
        path: file_name.clone(),
        original_name: file_name,
        sha256: sha256_hash,
        size,
    })
}
