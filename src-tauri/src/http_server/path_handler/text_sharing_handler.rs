//! # 文本共享处理器

use crate::db::dao::upload_dao;
use crate::db::entity::UploadRecord;
use crate::db::sqlite::get_pool;
use crate::http_server::responses::{error, success_json};
use http_body_util::BodyExt;
use hyper::body::Incoming;
use hyper::{Request, Response, StatusCode};
use lan_share_http_macros::{get, post};
use serde_json::Value::Null;
use sqlx::Row;
use std::collections::HashMap;
use std::net::SocketAddr;
use crate::handler::GenericResponseBody;

/// 上传共享的文本接口
#[post("/upload/text")]
pub async fn upload_text(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    // 从 extensions 中获取客户端地址
    let client_ip = _req
        .extensions()
        .get::<SocketAddr>()
        .map(|addr| addr.ip().to_string())
        .unwrap_or_else(|| "Unknown IP".to_string());

    let collected_body = match _req.into_body().collect().await {
        Ok(collected) => collected,
        Err(e) => {
            // 处理读取 body 时的错误
            let body = format!("Error reading body: {}", e);
            return error(StatusCode::BAD_REQUEST, &body.to_string());
        }
    };

    let body_bytes = collected_body.to_bytes();
    let body_str = match String::from_utf8(body_bytes.to_vec()) {
        Ok(str) => str,
        Err(e) => {
            log::error!("Error converting body to UTF-8 string: {}", e);
            return error(
                StatusCode::BAD_REQUEST,
                "Invalid UTF-8 in request body".into(),
            );
        }
    };

    // 解析 JSON 格式
    let req_params: HashMap<String, String> = match serde_json::from_str(&body_str) {
        Ok(params) => params,
        Err(e) => {
            log::error!("Error parsing JSON data: {}", e);
            return error(StatusCode::BAD_REQUEST, "Invalid JSON format".into());
        }
    };

    let upload_content = req_params.get("textData").cloned().unwrap();

    log::info!("来自[{}]的文本：{}", client_ip, upload_content);

    //TODO 判断文本是否被存储过，被存储过则更新时间即可。

    upload_dao::add(1, &upload_content, &client_ip)
        .await
        .unwrap();

    // 响应接收成功
    success_json(Null)
}

/// 获取已被记录的共享文本
#[get("/upload/text")]
pub async fn text_history(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let records = upload_dao::list_by_type(1)
        .await
        .unwrap();

    // let records = sqlx::query(
    //     "
    // SELECT
    //     id,
    //     upload_type,
    //     content,
    //     ip,
    //     created_at
    // FROM
    //     upload_record
    // ORDER BY created_at DESC
    //     ",
    // )
    // .fetch_all(get_pool())
    // .await
    // .unwrap();
    //
    //
    // // 手动映射到结构体
    // let record_obj: Vec<UploadRecord> = records
    //     .iter()
    //     .map(|row| UploadRecord {
    //         id: row.get("id"),
    //         upload_type: row.get("upload_type"),
    //         content: row.get("content"),
    //         ip: row.get("ip"),
    //         created_at: row.get("created_at"),
    //     })
    //     .collect();

    // 这里响应历史记录
    success_json(records)
}
