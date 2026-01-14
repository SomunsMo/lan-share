use crate::handler::GenericResponseBody;
use crate::http_server::responses::success_json;
use crate::{get, post};
use hyper::body::Incoming;
use hyper::{Request, Response};

// 用户列表 - GET /api/users
#[get("/api/users")]
pub async fn get_users(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let res_json = serde_json::json!({
        "code": 200,
        "status": "success",
        "data": [
            {"id": 1, "name": "张三", "email": "zhang@example.com"},
            {"id": 2, "name": "李四", "email": "li@example.com"}
        ]
    })
    .to_string();

    success_json(res_json)
}

// 获取单个用户 - GET /api/users/{id}
#[get("/api/users/:id")]
pub async fn get_user_by_id(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
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

    success_json(res_json)
}

// 创建用户 - POST /api/users
#[post("/api/users")]
pub async fn create_user(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let res_json = serde_json::json!({
        "code": 200,
        "message": "用户创建成功",
        "data": {
            "id": 3,
            "name": "新用户"
        }
    })
    .to_string();

    success_json(res_json)
}
