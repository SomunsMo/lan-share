use crate::{get, post};
use hyper::body::Incoming;
use hyper::{header, Request, Response};

// 用户列表 - GET /api/users
#[get("/api/users")]
pub async fn get_users(
    _req: Request<Incoming>,
) -> Result<Response<String>, std::convert::Infallible> {
    let res_json = serde_json::json!({
        "code": 200,
        "status": "success",
        "data": [
            {"id": 1, "name": "张三", "email": "zhang@example.com"},
            {"id": 2, "name": "李四", "email": "li@example.com"}
        ]
    })
    .to_string();

    let mut response = Response::new(res_json);
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        "application/json; charset=utf-8".parse().unwrap(),
    );
    Ok(response)
}

// 获取单个用户 - GET /api/users/{id}
#[get("/api/users/:id")]
pub async fn get_user_by_id(
    _req: Request<Incoming>,
) -> Result<Response<String>, std::convert::Infallible> {
    let res_json = serde_json::json!({
        "code": 200,
        "status": "success",
        "data": {
            "id": 1,
            "name": "张三",
            "email": "zhang@example.com",
            "created_at": "2024-01-01"
        }
    })
    .to_string();

    let mut response = Response::new(res_json);
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        "text/html; charset=utf-8".parse().unwrap(),
    );
    Ok(response)
}

// 创建用户 - POST /api/users
#[post("/api/users")]
pub async fn create_user(
    _req: Request<Incoming>,
) -> Result<Response<String>, std::convert::Infallible> {
    let res_json = serde_json::json!({
        "code": 200,
        "message": "用户创建成功",
        "data": {
            "id": 3,
            "name": "新用户"
        }
    })
    .to_string();

    let mut response = Response::new(res_json);
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        "text/html; charset=utf-8".parse().unwrap(),
    );
    Ok(response)
}
