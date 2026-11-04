//! # 访问密码认证接口

use crate::auth::{self, LoginResult};
use crate::extract_json_body;
use crate::http_server::handler::GenericResponseBody;
use crate::http_server::responses::{error, success_json};
use hyper::body::Incoming;
use hyper::{header, Request, Response, StatusCode};
use lan_share_http_macros::{get, post};
use serde::Deserialize;

#[derive(Deserialize)]
struct LoginBody {
    password: String,
}

/// 查询访问密码状态（公开接口）
#[get("/auth/status")]
pub async fn auth_status(
    req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    success_json(auth::status(&req))
}

/// 使用访问密码登录（公开接口）
#[post("/auth/login")]
pub async fn auth_login(
    mut req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let client_ip = auth::client_ip(&req);
    let ua = auth::user_agent(&req);

    let body: LoginBody = match extract_json_body(&mut req).await {
        Ok(body) => body,
        Err(e) => {
            log::warn!(
                "登录请求体解析失败 ip={} ua={} error={}",
                client_ip,
                ua,
                e
            );
            return error(StatusCode::BAD_REQUEST, "Invalid JSON body");
        }
    };

    match auth::login(&body.password, client_ip, &ua).await {
        LoginResult::NotRequired => success_json(()),
        LoginResult::Success(token) => {
            let mut response = success_json(()).unwrap();
            let cookie = auth::build_session_cookie(&token);
            response
                .headers_mut()
                .insert(header::SET_COOKIE, cookie.parse().unwrap());
            Ok(response)
        }
        LoginResult::PasswordNotSet => {
            error(StatusCode::UNAUTHORIZED, "管理员尚未设置访问密码")
        }
        LoginResult::Invalid => error(StatusCode::UNAUTHORIZED, "密码错误"),
        LoginResult::Locked(secs) => {
            let mut response = error(
                StatusCode::TOO_MANY_REQUESTS,
                "登录失败次数过多，请稍后再试",
            )
            .unwrap();
            response
                .headers_mut()
                .insert(header::RETRY_AFTER, secs.to_string().parse().unwrap());
            Ok(response)
        }
        LoginResult::Internal(msg) => {
            log::error!("登录处理失败: {}", msg);
            error(StatusCode::INTERNAL_SERVER_ERROR, "登录处理失败")
        }
    }
}

/// 登出（公开接口，清除会话和 Cookie）
#[post("/auth/logout")]
pub async fn auth_logout(
    req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    auth::logout(&req);

    let mut response = success_json(()).unwrap();
    let cookie = auth::build_clear_cookie();
    response
        .headers_mut()
        .insert(header::SET_COOKIE, cookie.parse().unwrap());
    Ok(response)
}
