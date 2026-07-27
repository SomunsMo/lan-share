use crate::normalizer::path_normalizer::path_normalizer;
use hyper::body::{Body, Bytes, Incoming};
use hyper::{Method, Request, Response};
use std::collections::HashMap;
use std::convert::Infallible;
use std::future::Future;
use std::pin::Pin;
use std::sync::{LazyLock, RwLock};

// 定义一个通用的响应体类型，可以是字符串或字节数组
#[derive(Debug)]
pub enum GenericResponseBody {
    String(String),
    Bytes(Bytes),
    FileData(Vec<u8>),
    Empty,
}

use std::task::Poll;

impl Body for GenericResponseBody {
    type Data = Bytes;
    type Error = Infallible;

    fn poll_frame(
        mut self: Pin<&mut Self>,
        _cx: &mut std::task::Context<'_>,
    ) -> Poll<Option<Result<hyper::body::Frame<Self::Data>, Self::Error>>> {
        use std::mem;

        // 检查是否已经是Empty状态（已发送）
        match mem::replace(self.as_mut().get_mut(), GenericResponseBody::Empty) {
            GenericResponseBody::String(s) => {
                let bytes = Bytes::from(s);
                Poll::Ready(Some(Ok(hyper::body::Frame::data(bytes))))
            }
        GenericResponseBody::Bytes(b) => Poll::Ready(Some(Ok(hyper::body::Frame::data(b)))),
        GenericResponseBody::FileData(v) => Poll::Ready(Some(Ok(hyper::body::Frame::data(Bytes::from(v))))),
        GenericResponseBody::Empty => {
                // 已经发送过了，返回 None 表示流结束
                Poll::Ready(None)
            }
        }
    }
}

// 定义处理函数返回的 Boxed 和 Pinned 的 Future 类型
// 现在支持通用响应体类型
pub type BoxedHandlerFuture = Pin<
    Box<dyn Future<Output = Result<Response<GenericResponseBody>, Infallible>> + Send + 'static>,
>;

// 定义可以存储在 BaseHandler 中的函数指针类型
// 这是一个同步函数指针，但它返回一个 BoxedHandlerFuture
pub type HandlerFunc = fn(Request<Incoming>) -> BoxedHandlerFuture;

/// 定义HTTP处理器
#[derive(Clone)]
pub struct BaseHandler {
    // 处理器所处理的接口地址
    pub path: &'static str,
    // 处理器处理的Http请求方法。None为通用方法处理器，可处理任何接口地址相同的任何请求方法。
    pub method: Option<Method>,
    // 处理器处理函数
    pub handler_func: HandlerFunc,
}

impl BaseHandler {
    pub async fn handle(
        &self,
        req: Request<Incoming>,
    ) -> Result<Response<GenericResponseBody>, Infallible> {
        // 1. 调用 handler_func，得到一个 BoxedHandlerFuture
        let future = (self.handler_func)(req);
        // 2. 立即等待（await）这个 Future
        future.await
    }

    pub fn matches(&self, path: &str, method: &Method) -> bool {
        match &self.method {
            Some(handler_method) if handler_method != method => return false,
            _ => {}
        }

        let pattern_segments: Vec<&str> = self.path.split('/').filter(|s| !s.is_empty()).collect();
        let path_segments: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();

        if pattern_segments.len() != path_segments.len() {
            return false;
        }

        for (p, a) in pattern_segments.iter().zip(path_segments.iter()) {
            if p.starts_with('{') && p.ends_with('}') {
                continue;
            }
            if p != a {
                return false;
            }
        }

        true
    }
}

// 全局处理器注册表
pub static HANDLER_REGISTRY: LazyLock<RwLock<HashMap<&'static str, Vec<BaseHandler>>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));

// 注册处理器
pub fn register_handler(handler: BaseHandler) {
    let path = handler.path;

    let mut registry = HANDLER_REGISTRY.write().unwrap();
    registry
        .entry(path)
        .or_insert_with(Vec::new)
        .push(handler);
    log::info!("Registered handler for path: {}", path);
}

// 获取处理器
pub fn get_handler(path: &str, method: &Method) -> Option<BaseHandler> {
    let path: &str = &*path_normalizer(path);

    let registry = HANDLER_REGISTRY.read().unwrap();

    // 先尝试精确匹配
    if let Some(method_vec) = registry.get(path) {
        if let Some(handler) = method_vec.iter().find(|h| h.matches(path, method)) {
            return Some(handler.clone());
        }
    }

    // 再尝试模式匹配（支持路径参数如 {id}）
    for method_vec in registry.values() {
        if let Some(handler) = method_vec.iter().find(|h| h.matches(path, method)) {
            return Some(handler.clone());
        }
    }

    None
}

