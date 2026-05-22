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

// 响应"成功"JSON
pub fn success_json<T: serde::Serialize>(
    data: T,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let res_json = serde_json::json!({
        "code": 200,
        "status": "success",
        "data": data
    })
    .to_string();

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
    let res_json = serde_json::json!( {
        "code": status.as_u16(),
        "status": msg
    })
    .to_string();

    let body = GenericResponseBody::String(res_json);

    let mut response = Response::new(body);
    *response.status_mut() = status;
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        "application/json; charset=utf-8".parse().unwrap(),
    );
    Ok(response)
}

pub fn redirect(url: &str) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let mut response = Response::new(GenericResponseBody::String("".to_string()));
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
    let mut response = Response::new(GenericResponseBody::String(html_content));
    *response.status_mut() = StatusCode::NOT_FOUND;
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        "text/html; charset=utf-8".parse().unwrap(),
    );
    Ok(response)
}
