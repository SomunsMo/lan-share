use crate::handler::GenericResponseBody;
use hyper::{header, Response, StatusCode};

// 响应“成功”
pub fn success(data: String) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let mut response = Response::new(GenericResponseBody::String(data));
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        "text/html; charset=utf-8".parse().unwrap(),
    );
    Ok(response)
}

// 响应“成功”JSON
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
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        "application/json; charset=utf-8".parse().unwrap(),
    );
    Ok(response)
}

pub fn redirect(url: &str) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let mut response = Response::new(GenericResponseBody::String("redirect".to_string()));
    response
        .headers_mut()
        .insert(header::LOCATION, url.parse().unwrap());
    Ok(response)
}
