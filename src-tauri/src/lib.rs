pub mod config {
    pub mod config;
}

pub mod cmd {
    pub mod _cmd_handler;
    pub mod system;
}

pub mod db {
    pub mod entity;
    pub mod sqlite;
    pub mod dao {
        pub mod config_dao;
        pub mod upload_dao;
    }
}

pub mod http_server {
    pub mod handler;
    pub mod http_server;
    pub mod responses;
    pub mod path_handler {
        pub mod file_sharing_handler;
        pub mod not_found_handler;
        pub mod text_sharing_handler;
        pub mod user_handler;
        pub mod web_handler;
    }
}

pub mod normalizer {
    pub mod path_normalizer;
}

pub mod utils {
    pub mod datetime;
}

pub mod example_param_injection;



// 导出宏
pub use lan_share_http_macros::{delete, get, post, put, request};

// 导出参数注入相关类型
mod param_extractor {
    use hyper::{body::Incoming, Request};
    use std::collections::HashMap;
    use serde::de::DeserializeOwned;
    use futures_util::Future;
    use std::pin::Pin;
    
    /// 用于解析URI参数的类型
    #[derive(Debug, Clone)]
    pub struct QueryParams(HashMap<String, String>);
    
    impl QueryParams {
        /// 获取参数值
        pub fn get(&self, key: &str) -> Option<&String> {
            self.0.get(key)
        }
        
        /// 检查是否包含某个参数
        pub fn contains_key(&self, key: &str) -> bool {
            self.0.contains_key(key)
        }
        
        /// 获取所有参数的引用
        pub fn all(&self) -> &HashMap<String, String> {
            &self.0
        }
        
        /// 获取参数数量
        pub fn len(&self) -> usize {
            self.0.len()
        }
        
        /// 检查是否为空
        pub fn is_empty(&self) -> bool {
            self.0.is_empty()
        }
    }
    
    /// 用于解析请求体的类型
    #[derive(Debug)]
    pub struct BodyData<T>(pub T);
    
    impl QueryParams {
        pub async fn from_request(req: &Request<Incoming>) -> Self {
            let query = req.uri().query().unwrap_or("");
            let params: HashMap<_, _> = form_urlencoded::parse(query.as_bytes())
                .into_owned()
                .collect();
            QueryParams(params)
        }
    }
    
    // 为原始请求创建一个别名
    pub type HttpRequest<'a> = &'a Request<Incoming>;
    
    impl<T: DeserializeOwned + Send + 'static> BodyData<T> {
        // 由于Incoming body只能消费一次，我们不提供自动注入
        // 用户需要手动解析body
    }
    
    // 提供一个手动解析body的函数
    pub async fn extract_json_body<T: DeserializeOwned>(req: &mut Request<Incoming>) -> Result<T, Box<dyn std::error::Error + Send + Sync>> {
        use http_body_util::BodyExt;
        let body_bytes = req.body_mut().collect().await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
        let body_str = String::from_utf8(body_bytes.to_bytes().to_vec())
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
        let parsed: T = serde_json::from_str(&body_str)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
        Ok(parsed)
    }
}

pub use param_extractor::{QueryParams, BodyData, extract_json_body};

// 模块构造函数支持
pub use ::ctor::ctor;
pub use http_server::handler;
use include_dir::{include_dir, Dir};

// 打包静态资源到可执行文件
pub static STATIC_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/static");

use cmd::_cmd_handler::get_cmd_handler;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // .invoke_handler(tauri::generate_handler![get_local_ip])
        .invoke_handler(get_cmd_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
