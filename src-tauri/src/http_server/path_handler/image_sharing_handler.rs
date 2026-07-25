use crate::config::config::get_image_sharing_dir;
use crate::db::dao::upload_dao;
use crate::http_server::handler::GenericResponseBody;
use crate::http_server::responses::error;
use hyper::body::Incoming;
use hyper::{header, Request, Response, StatusCode};
use lan_share_http_macros::get;
use serde_json::Value;
use mime_guess;

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
        .body(body)
        .unwrap();

    Ok(response)
}
