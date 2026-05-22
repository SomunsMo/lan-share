use hyper::body::Incoming;
use hyper::service::service_fn;
use hyper::{Method, Request, Response};
use hyper_util::rt::{TokioExecutor, TokioIo};
use hyper_util::server::conn::auto;
use std::convert::Infallible;
use tokio::net::TcpListener;

use crate::http_server::handler;
use crate::http_server::handler::GenericResponseBody;
use local_ip_address::local_ip;

// 处理HTTP请求的异步函数
async fn handle_request(
    req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, Infallible> {
    let path = req.uri().path();
    let method = req.method().clone();

    // 从处理器注册表中查找对应的处理器
    match handler::get_handler(path, &method) {
        Some(handler) => {
            log::info!("✅ 找到处理器: {}", path);
            handler.handle(req).await
        }
        None => {
            log::error!("❌ 未找到处理器: {}", path);
            // 返回 404 页面
            if let Some(not_found_handler) = handler::get_handler("/404", &Method::GET) {
                not_found_handler.handle(req).await
            } else {
                // 如果连404处理器都没有，返回默认错误响应
                Ok(Response::builder()
                    .status(404)
                    .header("Content-Type", "text/plain")
                    .body(GenericResponseBody::String("Not Found".to_string()))
                    .unwrap())
            }
        }
    }
}

/// 启动HTTP服务器（使用预绑定的TcpListener）
pub async fn start_server(listener: TcpListener, port: u16) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    println!("========================================");
    println!("✅ Lan Share 服务启动成功");
    println!("📍 访问地址: http://{}:{}", local_ip()?, port);
    println!("⏹️ Ctrl+C 停止服务");
    println!("========================================");

    loop {
        let (tcp_stream, remote_addr) = listener.accept().await?;

        let io = TokioIo::new(tcp_stream);
        let service = service_fn(move |mut req: Request<Incoming>| {
            // 将客户端地址插入到 request extensions 中，否则handler无法获取客户端IP和端口
            req.extensions_mut().insert(remote_addr);
            handle_request(req)
        });

        tokio::spawn(async move {
            if let Err(err) = auto::Builder::new(TokioExecutor::new())
                .serve_connection(io, service)
                .await
            {
                eprintln!("❌ 连接处理错误 ({}): {}", remote_addr, err);
            }
        });
    }
}
