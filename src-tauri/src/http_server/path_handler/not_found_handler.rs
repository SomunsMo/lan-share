//! 到接口找不到对应处理器的时候就调用该模块内的函数

use crate::request;
use hyper::body::Incoming;
use hyper::{header, Request, Response};
use std::fs;

/// 404页面
#[request("/404")]
pub async fn not_found(
    _req: Request<Incoming>,
) -> Result<Response<String>, std::convert::Infallible> {
    // 从文件读取HTML
    match fs::read_to_string("static/front/404.html") {
        Ok(html_content) => {
            let mut response = Response::new(html_content);
            response.headers_mut().insert(
                header::CONTENT_TYPE,
                "text/html; charset=utf-8".parse().unwrap(),
            );
            Ok(response)
        }
        Err(_) => {
            let mut response = Response::new("404 Not Found".to_string());
            response.headers_mut().insert(
                header::CONTENT_TYPE,
                "text/plain; charset=utf-8".parse().unwrap(),
            );
            Ok(response)
        }
    }
}
