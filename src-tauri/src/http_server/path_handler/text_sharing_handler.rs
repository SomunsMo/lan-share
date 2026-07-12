//! # 文本共享处理器

use crate::db::dao::upload_dao;
use crate::handler::GenericResponseBody;
use crate::http_server::responses::{error, success_json};
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

    if let Err(e) = upload_dao::add(1, &req_body.text_data, None, &client_ip, false).await {
        log::error!("保存文本记录失败: {}", e);
    }

    success_json(())
}

/// 获取已被记录的共享文本
#[get("/upload/text")]
pub async fn text_history(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let records = upload_dao::list_by_type(1).await.unwrap();
    success_json(records)
}
