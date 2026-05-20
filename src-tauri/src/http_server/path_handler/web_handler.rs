use crate::handler::GenericResponseBody;
use crate::http_server::responses::{redirect, success};
use crate::request;
use crate::STATIC_DIR;
use hyper::body::Incoming;
use hyper::{Request, Response};
use include_dir::File;

#[request("/")]
pub async fn home_page_redirect(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    // 永久重定向到/web
    redirect("/web")
}

#[request("/web")]
pub async fn web_handler(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    //TODO 先从文件中读取，如果文件中没有，则读取默认的网页

    // 从文件读取HTML
    match STATIC_DIR
        .get_file("frontend/index.html")
        .and_then(File::contents_utf8)
        .map(|s| s.to_string())
    {
        Some(html_content) => success(html_content),
        None => {
            // 文件不存在，返回404
            let html_content = "404".to_string();
            success(html_content)
        }
    }
}
