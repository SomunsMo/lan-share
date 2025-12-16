use hyper::{header, Response, StatusCode};

// 响应“成功”
pub fn success<T: serde::Serialize>(data: T) -> Result<Response<String>, std::convert::Infallible> {
    let res_json = serde_json::json!({
        "code": 200,
        "status": "success",
        "data": data
    })
    .to_string();

    let mut response = Response::new(res_json);
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        "application/json; charset=utf-8".parse().unwrap(),
    );
    Ok(response)
}

// 错误的请求
pub fn error(status: StatusCode, msg: &str) -> Result<Response<String>, std::convert::Infallible> {
    let res_json = serde_json::json!({
        "code": status.as_u16(),
        "status": msg
    })
    .to_string();

    let mut response = Response::new(res_json);
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        "application/json; charset=utf-8".parse().unwrap(),
    );
    Ok(response)
}

pub fn redirect(url: &str) -> Result<Response<String>, std::convert::Infallible> {
    let mut response = Response::new(String::new());
    response
        .headers_mut()
        .insert(header::LOCATION, url.parse().unwrap());
    Ok(response)
}
