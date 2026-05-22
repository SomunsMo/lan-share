use crate::handler::GenericResponseBody;
use crate::http_server::responses::{redirect, success};
use crate::request;
use crate::STATIC_DIR;
use crate::config::config::get_config_dir;
use hyper::body::Incoming;
use hyper::{Request, Response};
use include_dir::File;
use std::fs;

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
    // 先尝试从配置目录中读取自定义网页
    let custom_html_path = get_config_dir().join("frontend/index.html");
    if let Ok(html_content) = fs::read_to_string(&custom_html_path) {
        return success(html_content);
    }

    // 到这说明没有自定义网页，则响应默认的网页
    match STATIC_DIR
        .get_file("frontend/index.html")
        .and_then(File::contents_utf8)
        .map(|s| s.to_string())
    {
        Some(html_content) => success(html_content),
        None => {
            // 默认网页不存在
            let html_content = "Client Page Not Found".to_string();
            log::error!("{}", html_content);
            success(html_content)
        }
    }
}
