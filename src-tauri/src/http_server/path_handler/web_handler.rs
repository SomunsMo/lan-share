use crate::http_server::responses::redirect;
use crate::request;
use crate::STATIC_DIR;
use hyper::body::Incoming;
use hyper::{header, Request, Response};
use include_dir::File;

#[request("/")]
pub async fn home_page_redirect(
    _req: Request<Incoming>,
) -> Result<Response<String>, std::convert::Infallible> {
    // 永久重定向到/web
    redirect("/web")
}

#[request("/web")]
pub async fn web_handler(
    _req: Request<Incoming>,
) -> Result<Response<String>, std::convert::Infallible> {
    //TODO 先从文件中读取，如果文件中没有，则读取默认的网页

    // 从文件读取HTML
    match STATIC_DIR
        .get_file("frontend/index.html")
        .and_then(File::contents_utf8)
        .map(|s| s.to_string())
    {
        Some(html_content) => {
            let mut response = Response::new(html_content);
            response.headers_mut().insert(
                header::CONTENT_TYPE,
                "text/html; charset=utf-8".parse().unwrap(),
            );
            Ok(response)
        }
        None => {
            // 如果文件不存在，返回默认的关于页面
            let html_content = r#"
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>关于我们</title>
                        </head>
                        <body>
                            <h1>关于我们</h1>
                            <p>这是关于页面</p>
                            <a href="/">返回首页</a>
                        </body>
                        </html>
                    "#
            .to_string();

            let mut response = Response::new(html_content);
            response.headers_mut().insert(
                header::CONTENT_TYPE,
                "text/html; charset=utf-8".parse().unwrap(),
            );
            Ok(response)
        }
    }
}
