use crate::db::dao::config_dao;
use crate::db::dao::upload_dao;
use crate::handler::GenericResponseBody;
use crate::http_server::responses::{error, success_json};
use crate::extract_json_body;
use hyper::body::Incoming;
use hyper::{Request, Response, StatusCode};
use lan_share_http_macros::post;
use serde::Deserialize;
use std::net::SocketAddr;

#[derive(Deserialize)]
struct CopyRecordBody {
    content_id: i64,
}

#[derive(Deserialize)]
struct DownloadRecordBody {
    file_name: String,
    dir: Option<String>,
}

/// 记录文本复制
#[post("/record/copy")]
pub async fn record_copy(
    mut _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let client_ip = _req
        .extensions()
        .get::<SocketAddr>()
        .map(|addr| addr.ip().to_string())
        .unwrap_or_else(|| "Unknown IP".to_string());

    // 检查记录开关
    let enabled = match config_dao::get_config_value("record_copy_enabled").await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(false),
        _ => false,
    };

    if !enabled {
        return success_json(());
    }

    let body: CopyRecordBody = match extract_json_body(&mut _req).await {
        Ok(b) => b,
        Err(e) => {
            log::error!("记录复制请求体解析失败: {}", e);
            return error(StatusCode::BAD_REQUEST, "Invalid JSON body");
        }
    };

    // 查原记录获取文本内容
    let original = match upload_dao::get_by_id(body.content_id).await {
        Ok(Some(r)) => r,
        _ => return error(StatusCode::NOT_FOUND, "Original record not found"),
    };

    if let Err(e) = upload_dao::add(3, &original.content, Some(body.content_id), &client_ip, false).await {
        log::error!("记录文本复制失败: {}", e);
        return error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to record copy");
    }

    success_json(())
}

/// 记录文件下载
#[post("/record/download")]
pub async fn record_download(
    mut _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let client_ip = _req
        .extensions()
        .get::<SocketAddr>()
        .map(|addr| addr.ip().to_string())
        .unwrap_or_else(|| "Unknown IP".to_string());

    // 检查记录开关
    let enabled = match config_dao::get_config_value("record_download_enabled").await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(false),
        _ => false,
    };

    if !enabled {
        return success_json(());
    }

    let body: DownloadRecordBody = match extract_json_body(&mut _req).await {
        Ok(b) => b,
        Err(_) => return error(StatusCode::BAD_REQUEST, "Invalid JSON body"),
    };

    let path = match &body.dir {
        Some(dir) if !dir.is_empty() => format!("{}/{}", dir, body.file_name),
        _ => body.file_name.clone(),
    };

    if let Err(e) = upload_dao::add(4, &path, None, &client_ip, false).await {
        log::error!("记录文件下载失败: {}", e);
        return error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to record download");
    }

    success_json(())
}
