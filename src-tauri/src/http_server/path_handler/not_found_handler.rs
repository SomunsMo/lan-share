//! 到接口找不到对应处理器的时候就调用该模块内的函数

use crate::handler::GenericResponseBody;
use crate::http_server::responses::{success_json, success};
use crate::request;
use hyper::body::Incoming;
use hyper::{Request, Response};
use std::fs;

/// 404页面
#[request("/404")]
pub async fn not_found(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    // 从文件读取HTML
    match fs::read_to_string("static/front/404.html") {
        Ok(html_content) => success(html_content),
        Err(_) => success("404 Not Found".to_string()),
    }
}
