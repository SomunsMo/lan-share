// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use colored::Colorize;
use directories::BaseDirs;
use env_logger::{Builder, Env};
use lan_share_lib::config::config::{get_config_dir, set_sharing_root_configured, CONFIG_DIR};
use lan_share_lib::db::dao::config_dao;
use lan_share_lib::db::sqlite;
use log::Level;
use std::fs;
use std::io::Write;
use std::path::PathBuf;

#[tokio::main]
async fn main() {
    // 软件初始化
    init().await;

    // 初始化UI
    lan_share_lib::run();

    // HTTP服务器在Tauri setup回调中启动，以便获取AppHandle发送事件
}

// 软件初始化
async fn init() {
    // 初始化日志系统
    init_logger();

    // 软件配置目录
    let proj_dir = BaseDirs::new()
        .unwrap()
        .config_dir()
        .join("Somunsm")
        .join("LanShare");
    CONFIG_DIR.set(proj_dir).unwrap();

    // 创建项目目录
    fs::create_dir_all(get_config_dir()).expect("project dir creation failed");

    // 初始化DB
    sqlite::init().await;

    // ====================【↓DB初始化后才能执行的代码】====================

    // 检查共享根目录是否已配置（用于首次运行检测）
    let fs_rd = config_dao::get_config_value("file_sharing_root_dir")
        .await
        .ok()
        .flatten();
    set_sharing_root_configured(fs_rd.is_some());

    // 文件共享根目录
    let fs_rd = fs_rd
        .map(PathBuf::from) // 直接转换
        .unwrap_or_else(|| {
            log::error!("cannot get config：file_sharing_root_dir");
            PathBuf::from("./uploads") // 默认 PathBuf
        });
    
    // 使用新的设置方法
    if let Err(e) = lan_share_lib::config::config::set_sharing_root_new(fs_rd).await {
        log::error!("设置共享根目录失败: {}", e);
    }

    // 读取窗口状态，存入全局供setup同步使用
    let ws = config_dao::get_config_value("window_state").await.ok().flatten();
    let _ = lan_share_lib::config::config::WINDOW_STATE_JSON.set(ws);

    // 读取HTTP端口配置，存入全局供setup使用
    let port = config_dao::get_config_value("http_port")
        .await
        .ok()
        .flatten()
        .and_then(|v| v.parse::<u16>().ok())
        .unwrap_or(3000);
    let _ = lan_share_lib::config::config::CONFIGURED_HTTP_PORT.set(port);
}

// 初始化日志系统
fn init_logger() {
    let env = Env::default().default_filter_or("debug");
    Builder::from_env(env)
        .format(|buf, record| {
            let timestamp = chrono::Local::now().format("%H:%M:%S%.3f");

            // 使用 colored 添加颜色
            let colored_level = match record.level() {
                Level::Error => record.level().to_string().red().bold(),
                Level::Warn => record.level().to_string().yellow().bold(),
                Level::Info => record.level().to_string().green().bold(),
                Level::Debug => record.level().to_string().blue(),
                Level::Trace => record.level().to_string().cyan(),
            };

            writeln!(
                buf,
                "{} {:<5} [{}] - {}",
                timestamp,
                colored_level,
                record.target(),
                record.args()
            )
        })
        .init();
}
