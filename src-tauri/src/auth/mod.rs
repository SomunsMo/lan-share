//! 访问密码与会话鉴权
//!
//! - 仅保护 Web/HTTP 访问，桌面端 IPC 不受影响
//! - 单一密码，无账户
//! - 密码使用 SHA-256 + 随机盐存储
//! - 会话保存在内存中，应用重启后失效

use crate::db::dao::config_dao;
use crate::http_server::handler::GenericResponseBody;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use hyper::body::Incoming;
use hyper::{header, Request, Response, StatusCode};
use log::{error, info, warn};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr};
use std::sync::{LazyLock, Mutex, RwLock};
use std::time::{Duration, Instant};

pub const COOKIE_NAME: &str = "lan_share_session";
/// 会话 Cookie 的长期有效期；服务端会话本身不过期，应用重启后内存会话丢失
const SESSION_COOKIE_MAX_AGE: u64 = 10 * 365 * 24 * 60 * 60;
const SALT_LEN: usize = 16;
pub const MIN_PASSWORD_LEN: usize = 6;
const LOCKOUT_THRESHOLD: u32 = 5;
const LOCKOUT_DURATION: Duration = Duration::from_secs(30);
const FAILURE_WINDOW: Duration = Duration::from_secs(10 * 60);
const DEFAULT_DELAY_MS: u64 = 1000;
pub const MIN_DELAY_MS: u64 = 500;
pub const MAX_DELAY_MS: u64 = 30_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FailurePolicy {
    Lockout,
    Delay,
}

impl Default for FailurePolicy {
    fn default() -> Self {
        Self::Lockout
    }
}

impl FailurePolicy {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Lockout => "lockout",
            Self::Delay => "delay",
        }
    }

    pub fn from_str(value: &str) -> Self {
        match value {
            "delay" => Self::Delay,
            _ => Self::Lockout,
        }
    }
}

#[derive(Default)]
struct AuthConfig {
    enabled: bool,
    password_hash: Option<String>,
    failure_policy: FailurePolicy,
    delay_ms: u64,
}

#[derive(Clone)]
struct FailureState {
    count: u32,
    last_failure: Instant,
    locked_until: Option<Instant>,
}

static AUTH: LazyLock<RwLock<AuthConfig>> = LazyLock::new(|| {
    RwLock::new(AuthConfig {
        delay_ms: DEFAULT_DELAY_MS,
        ..Default::default()
    })
});
static SESSIONS: LazyLock<Mutex<HashMap<String, ()>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static FAILURES: LazyLock<Mutex<HashMap<IpAddr, FailureState>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Serialize)]
pub struct PasswordStatus {
    pub enabled: bool,
    pub password_set: bool,
}

#[derive(Serialize)]
pub struct AuthStatus {
    pub password_enabled: bool,
    pub password_set: bool,
    pub authenticated: bool,
}

pub enum LoginResult {
    NotRequired,
    Success(String),
    PasswordNotSet,
    Invalid,
    Locked(u64),
    Internal(String),
}

/// 从数据库加载访问密码配置（应用启动时调用）
pub async fn init_from_config() {
    let configs = config_dao::get_config_values(&[
        "password_enabled",
        "password_hash",
        "login_failure_policy",
        "login_failure_delay_ms",
    ])
    .await;

    let enabled = configs
        .get("password_enabled")
        .map(|v| v == "true")
        .unwrap_or(false);
    let password_hash = configs
        .get("password_hash")
        .filter(|v| !v.is_empty())
        .cloned();
    let failure_policy = FailurePolicy::from_str(
        configs
            .get("login_failure_policy")
            .map(|v| v.as_str())
            .unwrap_or("lockout"),
    );
    let delay_ms = configs
        .get("login_failure_delay_ms")
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(DEFAULT_DELAY_MS)
        .clamp(MIN_DELAY_MS, MAX_DELAY_MS);

    let mut guard = AUTH.write().unwrap();
    guard.enabled = enabled;
    guard.password_hash = password_hash;
    guard.failure_policy = failure_policy;
    guard.delay_ms = delay_ms;

    info!(
        "访问密码初始化完成: enabled={}, password_set={}, failure_policy={}, delay_ms={}",
        enabled,
        guard.password_hash.is_some(),
        failure_policy.as_str(),
        delay_ms
    );
}

pub fn get_status() -> PasswordStatus {
    let guard = AUTH.read().unwrap();
    PasswordStatus {
        enabled: guard.enabled,
        password_set: guard.password_hash.is_some(),
    }
}

pub async fn set_enabled(enabled: bool) -> Result<PasswordStatus, String> {
    config_dao::set_config("password_enabled", if enabled { "true" } else { "false" })
        .await
        .map_err(|e| format!("保存访问密码开关失败: {}", e))?;

    {
        let mut guard = AUTH.write().unwrap();
        guard.enabled = enabled;
    }
    invalidate_all_sessions();

    info!("访问密码已{}", if enabled { "开启" } else { "关闭" });
    Ok(get_status())
}

pub async fn set_password(password: &str) -> Result<(), String> {
    let stored = hash_password(password)?;

    config_dao::set_config("password_hash", &stored)
        .await
        .map_err(|e| format!("保存访问密码失败: {}", e))?;

    {
        let mut guard = AUTH.write().unwrap();
        guard.password_hash = Some(stored);
    }
    invalidate_all_sessions();

    info!("访问密码已设置");
    Ok(())
}

pub async fn clear_password() -> Result<(), String> {
    if AUTH.read().unwrap().enabled {
        return Err("请先关闭访问密码保护，再清除密码".to_string());
    }

    config_dao::set_config("password_hash", "")
        .await
        .map_err(|e| format!("清除访问密码失败: {}", e))?;

    {
        let mut guard = AUTH.write().unwrap();
        guard.password_hash = None;
    }
    invalidate_all_sessions();

    info!("访问密码已清除");
    Ok(())
}

pub fn get_failure_policy() -> FailurePolicy {
    AUTH.read().unwrap().failure_policy
}

pub async fn set_failure_policy(policy: FailurePolicy) -> Result<(), String> {
    config_dao::set_config("login_failure_policy", policy.as_str())
        .await
        .map_err(|e| format!("保存登录失败处理策略失败: {}", e))?;

    AUTH.write().unwrap().failure_policy = policy;
    info!("登录失败处理策略已更新为: {}", policy.as_str());
    Ok(())
}

/// 固定延迟时长（毫秒），仅 `delay` 策略生效
pub fn get_delay_ms() -> u64 {
    AUTH.read().unwrap().delay_ms
}

pub async fn set_delay_ms(delay_ms: u64) -> Result<(), String> {
    if !(MIN_DELAY_MS..=MAX_DELAY_MS).contains(&delay_ms) {
        return Err(format!(
            "延迟时长必须在 {} 到 {} 毫秒之间",
            MIN_DELAY_MS, MAX_DELAY_MS
        ));
    }

    config_dao::set_config("login_failure_delay_ms", &delay_ms.to_string())
        .await
        .map_err(|e| format!("保存固定延迟时长失败: {}", e))?;

    AUTH.write().unwrap().delay_ms = delay_ms;
    info!("登录失败固定延迟已更新为: {}ms", delay_ms);
    Ok(())
}

fn hash_password(password: &str) -> Result<String, String> {
    if password.chars().count() < MIN_PASSWORD_LEN {
        return Err(format!("密码至少需要 {} 位", MIN_PASSWORD_LEN));
    }

    let mut salt = [0u8; SALT_LEN];
    getrandom::getrandom(&mut salt).map_err(|e| format!("生成随机盐失败: {}", e))?;
    let digest = sha256_digest(&salt, password);

    Ok(format!(
        "sha256${}${}",
        STANDARD.encode(salt),
        STANDARD.encode(digest)
    ))
}

fn sha256_digest(salt: &[u8], password: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(salt);
    hasher.update(password.as_bytes());
    let digest = hasher.finalize();
    let mut out = [0u8; 32];
    out.copy_from_slice(&digest);
    out
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

pub fn verify_password(password: &str) -> bool {
    let stored = AUTH.read().unwrap().password_hash.clone();
    match stored {
        Some(hash) => verify_password_hash(&hash, password),
        None => false,
    }
}

fn verify_password_hash(stored: &str, password: &str) -> bool {
    let mut parts = stored.split('$');
    if parts.next() != Some("sha256") {
        return false;
    }
    let (Some(salt_b64), Some(hash_b64)) = (parts.next(), parts.next()) else {
        return false;
    };
    if parts.next().is_some() {
        return false;
    }

    let (Ok(salt), Ok(expected)) = (STANDARD.decode(salt_b64), STANDARD.decode(hash_b64)) else {
        return false;
    };
    let actual = sha256_digest(&salt, password);
    constant_time_eq(&actual, &expected)
}

pub fn create_session() -> Result<String, String> {
    let mut bytes = [0u8; 32];
    getrandom::getrandom(&mut bytes).map_err(|e| format!("生成会话失败: {}", e))?;
    let token = STANDARD.encode(bytes);
    SESSIONS.lock().unwrap().insert(token.clone(), ());
    Ok(token)
}

pub fn validate_session(token: &str) -> bool {
    SESSIONS.lock().unwrap().contains_key(token)
}

pub fn remove_session(token: &str) {
    SESSIONS.lock().unwrap().remove(token);
}

pub fn invalidate_all_sessions() {
    SESSIONS.lock().unwrap().clear();
}

pub fn build_session_cookie(token: &str) -> String {
    format!(
        "{}={}; Path=/; HttpOnly; SameSite=Lax; Max-Age={}",
        COOKIE_NAME, token, SESSION_COOKIE_MAX_AGE
    )
}

pub fn build_clear_cookie() -> String {
    format!(
        "{}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        COOKIE_NAME
    )
}

pub fn parse_cookie(header_value: &str, name: &str) -> Option<String> {
    header_value.split(';').find_map(|pair| {
        let (key, value) = pair.trim().split_once('=')?;
        if key == name {
            Some(value.to_string())
        } else {
            None
        }
    })
}

pub fn cookie_token(req: &Request<Incoming>) -> Option<String> {
    let header_value = req.headers().get(header::COOKIE)?.to_str().ok()?;
    parse_cookie(header_value, COOKIE_NAME)
}

pub fn is_authenticated(req: &Request<Incoming>) -> bool {
    let enabled = AUTH.read().unwrap().enabled;
    if !enabled {
        return true;
    }
    cookie_token(req)
        .map(|token| validate_session(&token))
        .unwrap_or(false)
}

/// 供 SSE 心跳复查：密码关闭时恒为 true
pub fn validate_current_auth(token: Option<&str>) -> bool {
    let enabled = AUTH.read().unwrap().enabled;
    if !enabled {
        return true;
    }
    token.map(validate_session).unwrap_or(false)
}

pub fn is_public_path(path: &str) -> bool {
    let path = if path.len() > 1 {
        path.trim_end_matches('/')
    } else {
        path
    };
    matches!(
        path,
        "/" | "/web" | "/favicon.ico" | "/auth/status" | "/auth/login" | "/auth/logout"
    )
}

/// 返回 Some(response) 表示请求被拒绝
pub fn guard(req: &Request<Incoming>) -> Option<Response<GenericResponseBody>> {
    let path = req.uri().path();
    if is_public_path(path) {
        return None;
    }
    if !AUTH.read().unwrap().enabled {
        return None;
    }
    if is_authenticated(req) {
        return None;
    }
    Some(unauthorized_response(req))
}

fn unauthorized_response(req: &Request<Incoming>) -> Response<GenericResponseBody> {
    let path = req.uri().path();
    let accept_html = req
        .headers()
        .get(header::ACCEPT)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.contains("text/html"))
        .unwrap_or(false);
    let navigate = req
        .headers()
        .get("sec-fetch-mode")
        .and_then(|v| v.to_str().ok())
        == Some("navigate");

    let wants_html = path.starts_with("/download/")
        || path.starts_with("/preview/")
        || path.starts_with("/shared-image/")
        || accept_html
        || navigate;

    if wants_html {
        let body = r#"<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>需要访问密码</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f6f9;color:#213547;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.box{max-width:420px;margin:20px;padding:28px;background:#fff;border:1px solid #dde1e6;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.08);text-align:center}
h1{margin:0 0 10px;font-size:1.2rem}
p{margin:0;line-height:1.7;color:#5a6b7a;font-size:.92rem}
a{color:#1e90ff}
</style>
</head>
<body>
<div class="box">
<h1>需要访问密码</h1>
<p>请先打开 <a href="/web">/web</a> 登录，然后再访问此链接。</p>
</div>
</body>
</html>"#;

        let mut response = Response::new(GenericResponseBody::String(body.to_string()));
        *response.status_mut() = StatusCode::UNAUTHORIZED;
        response.headers_mut().insert(
            header::CONTENT_TYPE,
            "text/html; charset=utf-8".parse().unwrap(),
        );
        response
            .headers_mut()
            .insert(header::CACHE_CONTROL, "no-store".parse().unwrap());
        response
    } else {
        let mut response = crate::http_server::responses::error(
            StatusCode::UNAUTHORIZED,
            "需要访问密码，请先登录",
        )
        .unwrap();
        response
            .headers_mut()
            .insert(header::CACHE_CONTROL, "no-store".parse().unwrap());
        response
    }
}

pub fn client_ip(req: &Request<Incoming>) -> IpAddr {
    req.extensions()
        .get::<std::net::SocketAddr>()
        .map(|addr| addr.ip())
        .unwrap_or(IpAddr::V4(Ipv4Addr::UNSPECIFIED))
}

pub fn user_agent(req: &Request<Incoming>) -> String {
    req.headers()
        .get(header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .chars()
        .take(256)
        .collect::<String>()
        .replace('\r', " ")
        .replace('\n', " ")
}

pub fn logout(req: &Request<Incoming>) {
    if let Some(token) = cookie_token(req) {
        remove_session(&token);
    }
}

pub fn status(req: &Request<Incoming>) -> AuthStatus {
    let (enabled, password_set) = {
        let guard = AUTH.read().unwrap();
        (guard.enabled, guard.password_hash.is_some())
    };
    AuthStatus {
        password_enabled: enabled,
        password_set,
        authenticated: !enabled || is_authenticated(req),
    }
}

pub async fn login(password: &str, ip: IpAddr, ua: &str) -> LoginResult {
    let (enabled, password_set, policy, delay_ms) = {
        let guard = AUTH.read().unwrap();
        (
            guard.enabled,
            guard.password_hash.is_some(),
            guard.failure_policy,
            guard.delay_ms,
        )
    };

    if !enabled {
        return LoginResult::NotRequired;
    }

    if !password_set {
        warn!("登录失败（尚未设置密码） ip={} ua={}", ip, ua);
        return LoginResult::PasswordNotSet;
    }

    if let Err(secs) = check_login_allowed(ip) {
        warn!("登录被锁定 ip={} ua={} retry_after={}s", ip, ua, secs);
        return LoginResult::Locked(secs);
    }

    if !verify_password(password) {
        record_login_failure(ip);
        warn!("登录失败 ip={} ua={}", ip, ua);
        if policy == FailurePolicy::Delay {
            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
        }
        return LoginResult::Invalid;
    }

    record_login_success(ip);
    match create_session() {
        Ok(token) => {
            info!("登录成功 ip={} ua={}", ip, ua);
            LoginResult::Success(token)
        }
        Err(e) => {
            error!("创建会话失败 ip={} ua={} error={}", ip, ua, e);
            LoginResult::Internal(e)
        }
    }
}

fn check_login_allowed(ip: IpAddr) -> Result<(), u64> {
    if get_failure_policy() != FailurePolicy::Lockout {
        return Ok(());
    }

    let mut failures = FAILURES.lock().unwrap();
    let now = Instant::now();
    failures.retain(|_, state| now.duration_since(state.last_failure) < FAILURE_WINDOW);

    if let Some(state) = failures.get(&ip) {
        if let Some(until) = state.locked_until {
            if until > now {
                return Err(until.duration_since(now).as_secs().max(1));
            }
        }
    }
    Ok(())
}

fn record_login_failure(ip: IpAddr) {
    if get_failure_policy() != FailurePolicy::Lockout {
        return;
    }

    let mut failures = FAILURES.lock().unwrap();
    let now = Instant::now();
    let state = failures.entry(ip).or_insert(FailureState {
        count: 0,
        last_failure: now,
        locked_until: None,
    });

    if now.duration_since(state.last_failure) >= FAILURE_WINDOW {
        state.count = 0;
    }
    state.count += 1;
    state.last_failure = now;

    if state.count >= LOCKOUT_THRESHOLD {
        state.locked_until = Some(now + LOCKOUT_DURATION);
        state.count = 0;
        warn!(
            "登录失败次数过多，IP {} 已锁定 {} 秒",
            ip,
            LOCKOUT_DURATION.as_secs()
        );
    }
}

fn record_login_success(ip: IpAddr) {
    FAILURES.lock().unwrap().remove(&ip);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn password_hash_round_trip() {
        let stored = hash_password("secret123").unwrap();
        assert!(verify_password_hash(&stored, "secret123"));
        assert!(!verify_password_hash(&stored, "secret124"));
        assert!(!verify_password_hash(&stored, ""));
    }

    #[test]
    fn empty_or_malformed_hash_never_verifies() {
        assert!(!verify_password_hash("", ""));
        assert!(!verify_password_hash("sha256$bad", ""));
        assert!(!verify_password_hash("sha256$bad$bad", ""));
        assert!(!verify_password_hash("plain", ""));
    }

    #[test]
    fn short_password_rejected() {
        assert!(hash_password("12345").is_err());
    }

    #[test]
    fn cookie_parsing() {
        let header_value = "a=1; lan_share_session=abc; b=2";
        assert_eq!(
            parse_cookie(header_value, COOKIE_NAME).as_deref(),
            Some("abc")
        );
        assert_eq!(parse_cookie(header_value, "missing"), None);
    }

    #[test]
    fn public_paths() {
        assert!(is_public_path("/"));
        assert!(is_public_path("/web"));
        assert!(is_public_path("/web/"));
        assert!(is_public_path("/auth/login"));
        assert!(!is_public_path("/upload/text"));
        assert!(!is_public_path("/download/file"));
    }
}
