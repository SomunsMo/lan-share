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

// 导出宏
pub use lan_share_http_macros::{delete, get, post, put, request};

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
