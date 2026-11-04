use hyper::body::Incoming;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::{TokioExecutor, TokioIo};
use hyper_util::server::conn::auto;
use std::convert::Infallible;
use std::net::SocketAddr;
use std::sync::Mutex;
use tokio::net::TcpListener;

use crate::http_server::handler;
use crate::http_server::handler::GenericResponseBody;
use crate::http_server::responses;
use local_ip_address::local_ip;

/// 当前 HTTP 服务任务的句柄（热切换时用于停掉旧服务）
static SERVER_TASK: Mutex<Option<tauri::async_runtime::JoinHandle<()>>> = Mutex::new(None);

/// 当前已建立的连接任务，重启服务时用于强制断开正在下载/SSE 的连接
static CONNECTIONS: Mutex<Vec<tauri::async_runtime::JoinHandle<()>>> = Mutex::new(Vec::new());

// 处理HTTP请求的异步函数
async fn handle_request(
    req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, Infallible> {
    // 访问密码鉴权：公开路径放行，其余请求必须携带有效会话
    if let Some(response) = crate::auth::guard(&req) {
        return Ok(response);
    }

    let path = req.uri().path();
    let method = req.method();

    // 从处理器注册表中查找对应的处理器
    match handler::get_handler(path, method) {
        Some(handler) => {
            log::debug!("找到处理器: {}", path);
            handler.handle(req).await
        }
        None => {
            log::error!("未找到处理器: {}", path);
            responses::not_found()
        }
    }
}

/// 给定端口打印访问地址
fn print_launch_info(port: u16) {
    println!("========================================");
    println!("Lan Share 服务启动成功");
    if let Ok(ip) = local_ip() {
        println!("访问地址: http://{}:{}", ip, port);
    }
    println!("========================================");
}

/// 绑定端口监听器（唯一可靠的"端口是否可用"判定：绑定成功即持有该端口）
pub async fn bind_listener(port: u16) -> Result<TcpListener, std::io::Error> {
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    TcpListener::bind(addr).await
}

/// 启动HTTP服务器
pub async fn start_server(port: u16) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let listener = bind_listener(port).await?;
    run_on(listener, port);
    Ok(())
}

/// 停掉当前运行中的 HTTP 服务任务（仅停止 accept 循环，
/// 已建立的连接是独立任务，会继续完成，不会中断传输）
pub fn stop_server() {
    if let Ok(mut guard) = SERVER_TASK.lock() {
        if let Some(handle) = guard.take() {
            handle.abort();
        }
    }
}

/// 强制断开当前所有已建立的连接（正在下载、SSE 等）
pub fn abort_all_connections() {
    if let Ok(mut connections) = CONNECTIONS.lock() {
        for handle in connections.drain(..) {
            handle.abort();
        }
    }
}

/// 重启 HTTP 服务：断开现有连接、停掉 accept 循环、重新绑定端口。
/// 不重启桌面应用；重启后清空访问密码会话。
pub async fn restart_server() -> Result<(), String> {
    let port = crate::config::config::get_running_http_port();

    abort_all_connections();
    stop_server();

    // abort 是异步的，旧 listener 需要一点时间释放端口，短暂重试绑定
    let mut last_error = String::new();
    for _ in 0..40 {
        match bind_listener(port).await {
            Ok(listener) => {
                run_on(listener, port);
                crate::config::config::set_occupied_port(None);
                crate::auth::invalidate_all_sessions();
                log::info!("HTTP服务已重启，端口: {}", port);
                return Ok(());
            }
            Err(e) => {
                last_error = e.to_string();
                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
            }
        }
    }

    Err(format!(
        "重启HTTP服务失败：端口 {} 无法绑定：{}",
        port, last_error
    ))
}

/// 用已绑定的监听器运行服务（先起新再停旧，端口热切换入口）
pub fn run_on(listener: TcpListener, port: u16) {
    print_launch_info(port);
    let new_handle = tauri::async_runtime::spawn(async move {
        serve(listener).await;
    });

    if let Ok(mut guard) = SERVER_TASK.lock() {
        if let Some(old) = guard.replace(new_handle) {
            old.abort();
        }
    }
    crate::config::config::set_running_http_port(port);
}

async fn serve(listener: TcpListener) {
    loop {
        let (tcp_stream, remote_addr) = match listener.accept().await {
            Ok(pair) => pair,
            Err(err) => {
                log::error!("HTTP 连接接受错误: {}", err);
                continue;
            }
        };

        let io = TokioIo::new(tcp_stream);
        let service = service_fn(move |mut req: Request<Incoming>| {
            // 将客户端地址插入到 request extensions 中，否则handler无法获取客户端IP和端口
            req.extensions_mut().insert(remote_addr);
            handle_request(req)
        });

        let handle = tauri::async_runtime::spawn(async move {
            if let Err(err) = auto::Builder::new(TokioExecutor::new())
                .serve_connection(io, service)
                .await
            {
                eprintln!("连接处理错误 ({}): {}", remote_addr, err);
            }
        });

        if let Ok(mut connections) = CONNECTIONS.lock() {
            connections.retain(|handle| !handle.inner().is_finished());
            connections.push(handle);
        }
    }
}
