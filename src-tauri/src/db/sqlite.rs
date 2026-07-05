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

    // 传输记录表（统一存储上传/下载/复制记录）
    // action_type: 1=文本分享, 2=文件分享, 3=文本复制, 4=文件下载
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS transfer_record (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action_type INTEGER NOT NULL,
            content TEXT,
            source_id INTEGER,
            ip TEXT NOT NULL,
            is_overwrite INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
    )
    .execute(get_pool())
    .await
    .unwrap();

    // 迁移旧数据（upload_record → transfer_record）
    migrate_old_data().await;
}

/// 将旧表 upload_record 的数据迁移到新表 transfer_record
async fn migrate_old_data() {
    // 检查旧表是否存在
    let old_table_exists: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='upload_record'"
    )
    .fetch_one(get_pool())
    .await
    .unwrap_or((0,));

    if old_table_exists.0 == 0 {
        return;
    }

    // 检查新表是否有数据（避免重复迁移）
    let new_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM transfer_record")
        .fetch_one(get_pool())
        .await
        .unwrap_or((0,));

    if new_count.0 > 0 {
        // 新表已有数据，删除旧表即可
        sqlx::query("DROP TABLE IF EXISTS upload_record")
            .execute(get_pool())
            .await
            .unwrap();
        return;
    }

    // 迁移数据：upload_type → action_type, 其余字段对应
    sqlx::query(
        "INSERT INTO transfer_record (id, action_type, content, source_id, ip, is_overwrite, created_at)
         SELECT id, upload_type, content, NULL, ip, is_overwrite, created_at FROM upload_record"
    )
    .execute(get_pool())
    .await
    .unwrap();

    // 删除旧表
    sqlx::query("DROP TABLE IF EXISTS upload_record")
        .execute(get_pool())
        .await
        .unwrap();

    log::info!("数据迁移完成: upload_record → transfer_record");
}
