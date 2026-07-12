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
        pub mod record_handler;
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

pub mod macos;
pub mod tray;

/// 由 build.rs 构建 src-web 并嵌入的 HTML
pub mod embedded {
    include!(concat!(env!("OUT_DIR"), "/frontend_html.rs"));
}

use log::error;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;

/// 用户主动退出标志，ExitRequested 时区分是窗口关闭还是主动退出
pub(crate) static QUITTING: AtomicBool = AtomicBool::new(false);

#[derive(Serialize, Deserialize, Clone, Debug)]
struct WindowState {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

pub(crate) const WINDOW_DEFAULT_W: u32 = 980;
pub(crate) const WINDOW_DEFAULT_H: u32 = 650;
pub(crate) const WINDOW_MIN_W: u32 = 980;
pub(crate) const WINDOW_MIN_H: u32 = 650;

fn save_window_state(window: &tauri::Window) {
    if let (Ok(pos), Ok(size)) = (window.outer_position(), window.inner_size()) {
        let state = WindowState {
            x: pos.x,
            y: pos.y,
            width: size.width,
            height: size.height,
        };
        if let Ok(json) = serde_json::to_string(&state) {
            tauri::async_runtime::spawn(async move {
                let _ = crate::db::dao::config_dao::set_config("window_state", &json).await;
            });
        }
    }
}

pub(crate) fn load_window_state() -> Option<WindowState> {
    crate::config::config::WINDOW_STATE_JSON
        .get()
        .and_then(|opt| opt.as_ref())
        .and_then(|json| serde_json::from_str(json).ok())
}

pub(crate) fn get_monitor_containing(
    window: &tauri::WebviewWindow,
    x: i32,
    y: i32,
) -> Option<tauri::Monitor> {
    let monitors = window.available_monitors().ok()?;
    monitors.into_iter().find(|m| {
        let mpos = m.position();
        let msize = m.size();
        x >= mpos.x
            && x < mpos.x + msize.width as i32
            && y >= mpos.y
            && y < mpos.y + msize.height as i32
    })
}

fn clamp_and_center(window: &tauri::WebviewWindow, saved: &WindowState) -> (i32, i32, u32, u32) {
    let monitor = get_monitor_containing(window, saved.x, saved.y)
        .or_else(|| window.primary_monitor().ok().flatten());
    let (mpos, msize) = match &monitor {
        Some(m) => (m.position(), m.size()),
        None => {
            return (
                saved.x,
                saved.y,
                saved.width.max(WINDOW_MIN_W),
                saved.height.max(WINDOW_MIN_H),
            )
        }
    };

    let width = saved.width.min(msize.width).max(WINDOW_MIN_W);
    let height = saved.height.min(msize.height).max(WINDOW_MIN_H);
    let x = saved
        .x
        .clamp(mpos.x, mpos.x + msize.width as i32 - width as i32);
    let y = saved
        .y
        .clamp(mpos.y, mpos.y + msize.height as i32 - height as i32);
    (x, y, width, height)
}

pub(crate) fn center_on_primary(window: &tauri::WebviewWindow) -> (i32, i32, u32, u32) {
    if let Ok(Some(monitor)) = window.primary_monitor() {
        let msize = monitor.size();
        let width = WINDOW_DEFAULT_W.min(msize.width);
        let height = WINDOW_DEFAULT_H.min(msize.height);
        let x = (msize.width as i32 - width as i32) / 2;
        let y = (msize.height as i32 - height as i32) / 2;
        (x.max(0), y.max(0), width, height)
    } else {
        (0, 0, WINDOW_DEFAULT_W, WINDOW_DEFAULT_H)
    }
}

/// 创建主窗口并根据保存的状态或默认值定位
pub(crate) fn create_and_position_window(
    app: &tauri::AppHandle,
    initial_route: Option<String>,
) -> tauri::WebviewWindow {
    let window =
        tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App("index.html".into()))
            .title("LAN Share")
            .inner_size(WINDOW_DEFAULT_W as f64, WINDOW_DEFAULT_H as f64)
            .min_inner_size(WINDOW_MIN_W as f64, WINDOW_MIN_H as f64)
            .visible(false)
            .build()
            .expect("创建主窗口失败");

    if let Some(route) = &initial_route {
        let route = route.clone();
        let _ = window.eval(&format!(
            r#"
            (function(){{
                var check = function(){{
                    if(window.__tauriNavigate) {{
                        window.__tauriNavigate('{}');
                    }} else {{
                        setTimeout(check, 5);
                    }}
                }};
                check();
            }})();
            "#,
            route
        ));
    }

    if let Some(saved) = load_window_state() {
        let (x, y, w, h) = clamp_and_center(&window, &saved);
        let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
        let _ = window.set_size(tauri::PhysicalSize::new(w, h));
    } else {
        let (x, y, w, h) = center_on_primary(&window);
        let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
        let _ = window.set_size(tauri::PhysicalSize::new(w, h));
    }
    let _ = window.show();

    window
}

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
            crate::tray::show_window(app, None);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(get_cmd_handler())
        .setup(|app| {
            let is_silent = std::env::args().any(|a| a == "--silent");
            if let Some(window) = app.get_webview_window("main") {
                if let Some(saved) = load_window_state() {
                    let (x, y, w, h) = clamp_and_center(&window, &saved);
                    let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
                    let _ = window.set_size(tauri::PhysicalSize::new(w, h));
                } else {
                    let (x, y, w, h) = center_on_primary(&window);
                    let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
                    let _ = window.set_size(tauri::PhysicalSize::new(w, h));
                }
                if !is_silent {
                    let _ = window.show();
                } else {
                    // --silent: 窗口保持隐藏，首次托盘打开时自然显示/重建
                    macos::set_dock_icon(false);
                }
            }

            tray::create_tray_menu(&app.handle());

            tauri::async_runtime::spawn(async move {
                if let Err(e) = crate::config::config::init_sharing_root_from_config().await {
                    error!("初始化共享根目录失败: {}", e);
                }
                crate::config::config::reload_exclude_filter().await;
            });

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
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                save_window_state(window);
                macos::set_dock_icon(false);
                // 不调用 prevent_close，让窗口真正销毁，由 ExitRequested 阻止进程退出
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, _event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = _event {
                if !QUITTING.load(Ordering::Relaxed) {
                    api.prevent_exit();
                }

                #[cfg(target_os = "macos")]
                {
                    tray::show_window(_app_handle, None);
                }
            }
        });
}
