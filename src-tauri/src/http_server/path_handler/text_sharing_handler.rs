//! # 文本共享处理器

use crate::db::dao::upload_dao;
use crate::handler::GenericResponseBody;
use crate::http_server::responses::{error, success_json};
use crate::http_server::sse::{fire, new_text};
use http_body_util::BodyExt;
use hyper::body::Incoming;
use hyper::{Request, Response, StatusCode};
use lan_share_http_macros::{get, post};
use serde::Deserialize;
use std::net::SocketAddr;

#[derive(Deserialize)]
struct UploadTextBody {
    #[serde(alias = "textData")]
    text_data: String,
}

/// 上传共享的文本接口
#[post("/upload/text")]
pub async fn upload_text(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
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

    let collected_body = match _req.into_body().collect().await {
        Ok(collected) => collected,
        Err(e) => {
            return error(StatusCode::BAD_REQUEST, &format!("Error reading body: {}", e));
        }
    };

    let body_bytes = collected_body.to_bytes();
    let req_body: UploadTextBody = match serde_json::from_slice(&body_bytes) {
        Ok(params) => params,
        Err(e) => {
            log::error!("Error parsing JSON data: {}", e);
            return error(StatusCode::BAD_REQUEST, "Invalid JSON format");
        }
    };

    log::info!("来自[{}]的文本：{}", client_ip, req_body.text_data);

    // 检查是否存在内容完全一致的文本记录，存在则刷新时间并递增共享次数
    match upload_dao::find_text_by_content(&req_body.text_data).await {
        Ok(Some(existing)) => {
            log::info!("发现重复文本 ID={}，刷新时间，共享数+1", existing.id);
            if let Err(e) = upload_dao::bump_record(existing.id).await {
                log::error!("刷新文本记录失败: {}", e);
            }
        }
        Ok(None) => {
            if let Err(e) = upload_dao::add(1, &req_body.text_data, None, &client_ip, false).await {
                log::error!("保存文本记录失败: {}", e);
            }
        }
        Err(e) => {
            log::error!("查询文本记录失败: {}", e);
        }
    }

    fire(new_text(client_id));
    success_json(())
}

/// 获取上传记录（文本+图片）
#[get("/upload/records")]
pub async fn upload_records(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let records = upload_dao::list_by_types(&[1, 5]).await.unwrap();
    success_json(records)
}
