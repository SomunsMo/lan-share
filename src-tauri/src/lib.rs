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
        pub mod text_sharing_handler;
        pub mod web_handler;
    }
}

pub mod normalizer {
    pub mod path_normalizer;
}

pub mod utils {
    pub mod datetime;
    pub mod path;
}

pub mod tray;

/// 由 build.rs 构建 src-web 并嵌入的 HTML
pub mod embedded {
    include!(concat!(env!("OUT_DIR"), "/frontend_html.rs"));
}

use log::error;
use tauri::Manager;

/// 使用 listeners crate 检测端口是否被占用
fn is_port_occupied(port: u16) -> bool {
    match listeners::get_process_by_port(port, listeners::Protocol::TCP) {
        Ok(_process) => true,
        Err(_) => false,
    }
}

// 导出宏
pub use lan_share_http_macros::{delete, get, post, put, request};

// 导出参数注入相关类型
mod param_extractor {
    use hyper::{body::Incoming, Request};
    use serde::de::DeserializeOwned;
    use std::collections::HashMap;

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

    impl<T: DeserializeOwned + Send + 'static> BodyData<T> {
        // 由于Incoming body只能消费一次，我们不提供自动注入
        // 用户需要手动解析body
    }

    // 提供一个手动解析body的函数
    pub async fn extract_json_body<T: DeserializeOwned>(
        req: &mut Request<Incoming>,
    ) -> Result<T, Box<dyn std::error::Error + Send + Sync>> {
        use http_body_util::BodyExt;
        let body_bytes = req
            .body_mut()
            .collect()
            .await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
        let body_str = String::from_utf8(body_bytes.to_bytes().to_vec())
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
        let parsed: T = serde_json::from_str(&body_str)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
        Ok(parsed)
    }
}

pub use param_extractor::{extract_json_body, BodyData, QueryParams};

// 模块构造函数支持
pub use ::ctor::ctor;
pub use http_server::handler;

use cmd::_cmd_handler::get_cmd_handler;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 当尝试启动第二个实例时，显示现有的主窗口
            if let Some(window) = app.get_webview_window("main") {
                // 尝试显示并聚焦窗口，忽略可能的错误
                let _ = window.show().map_err(|e| {
                    log::warn!("Failed to show window: {}", e);
                });
                let _ = window.set_focus().map_err(|e| {
                    log::warn!("Failed to focus window: {}", e);
                });
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(get_cmd_handler())
        .setup(|app| {
            // 构建系统托盘
            tray::create_tray_menu(&app.handle());

            // 初始化共享根目录
            tauri::async_runtime::spawn(async move {
                if let Err(e) = crate::config::config::init_sharing_root_from_config().await {
                    error!("初始化共享根目录失败: {}", e);
                }
            });

            // ===== 使用 listeners crate 检测端口占用 =====
            let port = *crate::config::config::get_configured_http_port();
            let _ = crate::config::config::RUNNING_HTTP_PORT.set(port);

            if is_port_occupied(port) {
                log::error!("端口 {} 已被占用", port);
                let _ = crate::config::config::OCCUPIED_PORT.set(port);
            } else {
                log::info!("端口 {} 可用，准备启动HTTP服务器", port);
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = crate::http_server::http_server::start_server(port).await {
                        log::error!("HTTP Server运行错误: {}", e);
                    }
                });
            }

            Ok(())
        })
        .on_menu_event(|app, event| {
            tray::handle_system_tray_menu_event(app, &event.id().0);
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 拦截关闭请求，将窗口隐藏到托盘而不是关闭
                api.prevent_close();
                window.hide().unwrap();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Reopen { .. } = event {
                tray::show_window(app_handle);
            }
        });
}
