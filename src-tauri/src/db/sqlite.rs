use crate::config::config::CONFIG_DIR;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Pool, Sqlite};
use std::fs;
use std::sync::OnceLock;

// 数据库连接池
static CONNECTION_POOL: OnceLock<Pool<Sqlite>> = OnceLock::new();
// 获取连接池
pub fn get_pool() -> &'static Pool<Sqlite> {
    CONNECTION_POOL
        .get()
        .expect("database connection is not initialized")
}

// 初始化SQLite数据库
pub async fn init() {
    // 配置数据库文件路径
    let config_dir = CONFIG_DIR.get().expect("'CONFIG_DIR' is not initialized");
    let db_path = config_dir.join("config.db");

    // 初始化DB文件（如果不存在则创建）
    init_db_file(&db_path.to_str().unwrap());

    // SQL lite 数据库连接url
    let database_url = format!("sqlite:{}", db_path.display());
    let pool = SqlitePoolOptions::new()
        .max_connections(16)
        .connect(&database_url)
        .await
        .unwrap();

    CONNECTION_POOL.set(pool).unwrap();

    // 初始化表（如果不存在则创建）
    init_table().await;

    // 7. 关闭连接池
    // pool.close().await;
}

// 如果数据库文件不存在，则会创建
fn init_db_file(db_path: &str) {
    if !std::path::Path::new(db_path).exists() {
        // 创建空的文件（SQLite 会识别并初始化）
        fs::File::create(db_path).unwrap();
        log::info!("数据库文件不存在，已自动创建于： {}", db_path);
    }
}

// 如果某表不存在，则会创建
async fn init_table() {
    // 配置表
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cfg_key TEXT NOT NULL, -- 配置key
            cfg_value TEXT NOT NULL, -- 配置值
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 创建时间
        )",
    )
    .execute(get_pool())
    .await
    .unwrap();

    // 上传记录表（包含）
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS upload_record (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            upload_type INTEGER NOT NULL , -- 上传类型（1=文本 | 2=文件）
            content TEXT, -- 上传的文本（上传类型是文本时使用）
            ip TEXT NOT NULL, -- 上传者的IP地址
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 创建时间
        )",
    )
    .execute(get_pool())
    .await
    .unwrap();
}
