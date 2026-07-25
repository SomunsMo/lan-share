use crate::config::config::get_config_dir;
use crate::handler::GenericResponseBody;
use hyper::{header, Response, StatusCode};
use std::fs;

// 响应"成功"
pub fn success(data: String) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let mut response = Response::new(GenericResponseBody::String(data));
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        "text/html; charset=utf-8".parse().unwrap(),
    );
    Ok(response)
}

use serde::Serialize;

#[derive(Serialize)]
struct JsonResponse<'a, T: Serialize> {
    code: u16,
    msg: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<T>,
}

#[derive(Serialize)]
struct JsonError<'a> {
    code: u16,
    msg: &'a str,
}

// 响应"成功"JSON
pub fn success_json<T: serde::Serialize>(
    data: T,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let res_json = serde_json::to_string(&JsonResponse {
        code: 200,
        msg: "success",
        data: Some(data),
    })
    .expect("JSON serialization failed");

    let mut response = Response::new(GenericResponseBody::String(res_json));
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        "application/json; charset=utf-8".parse().unwrap(),
    );
    Ok(response)
}

// 错误的请求
pub fn error(
    status: StatusCode,
    msg: &str,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let res_json = serde_json::to_string(&JsonError {
        code: status.as_u16(),
        msg,
    })
    .expect("JSON serialization failed");

    let body = GenericResponseBody::String(res_json.clone());

    let mut response = Response::new(body);
    *response.status_mut() = status;
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        "application/json; charset=utf-8".parse().unwrap(),
    );
    response.headers_mut().insert(
        header::CONTENT_LENGTH,
        res_json.len().to_string().parse().unwrap(),
    );
    Ok(response)
}

pub fn redirect(url: &str) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let mut response = Response::new(GenericResponseBody::String(String::new()));
    *response.status_mut() = StatusCode::FOUND;
    response
        .headers_mut()
        .insert(header::LOCATION, url.parse().unwrap());
    Ok(response)
}

// 404页面
pub fn not_found() -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let custom_html_path = get_config_dir().join("frontend/404.html");
    let html_content = fs::read_to_string(&custom_html_path)
        // 无自定义404页面，降级使用默认提示文本
        .unwrap_or_else(|_| "404 Not Found（页面不存在）".to_string());
    let body = GenericResponseBody::String(html_content.clone());
    let mut response = Response::new(body);
    *response.status_mut() = StatusCode::NOT_FOUND;
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        "text/html; charset=utf-8".parse().unwrap(),
    );
    response.headers_mut().insert(
        header::CONTENT_LENGTH,
        html_content.len().to_string().parse().unwrap(),
    );
    Ok(response)
}
