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
    init_db_file(db_path.to_str().unwrap());

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
            cfg_key TEXT NOT NULL UNIQUE, -- 配置key
            cfg_value TEXT NOT NULL, -- 配置值
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 创建时间
        )",
    )
    .execute(get_pool())
    .await
    .unwrap();

    // 兼容旧数据库：已有表没有 UNIQUE 约束，补建唯一索引
    sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_config_cfg_key ON config(cfg_key)")
        .execute(get_pool())
        .await
        .unwrap();

    // 传输记录表（统一存储上传/下载/复制记录）
    // action_type: 1=文本分享, 2=文件分享, 3=文本复制, 4=文件下载, 5=图片分享
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS transfer_record (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action_type INTEGER NOT NULL,
            content TEXT,
            source_id INTEGER,
            ip TEXT NOT NULL,
            is_overwrite INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            share_count INTEGER NOT NULL DEFAULT 1
        )",
    )
    .execute(get_pool())
    .await
    .unwrap();

    // 兼容旧表结构：ALTER TABLE ADD COLUMN 不允许非常量 DEFAULT，分步处理
    // share_count: 常量 1，可以带 NOT NULL DEFAULT
    if let Err(e) = sqlx::query("ALTER TABLE transfer_record ADD COLUMN share_count INTEGER NOT NULL DEFAULT 1").execute(get_pool()).await {
        let msg = e.to_string().to_lowercase();
        if !msg.contains("duplicate column") {
            panic!("数据库迁移失败(share_count): {}", e);
        }
    }
    // updated_at: CURRENT_TIMESTAMP 是函数不是常量，先加列再设值
    if let Err(e) = sqlx::query("ALTER TABLE transfer_record ADD COLUMN updated_at DATETIME").execute(get_pool()).await {
        let msg = e.to_string().to_lowercase();
        if !msg.contains("duplicate column") {
            panic!("数据库迁移失败(updated_at): {}", e);
        }
    } else {
        // 新加的列，给旧记录补充初始值
        sqlx::query("UPDATE transfer_record SET updated_at = created_at WHERE updated_at IS NULL")
            .execute(get_pool()).await.unwrap();
    }

    // 迁移旧数据（upload_record → transfer_record）
    migrate_old_data().await;

    // 共享历史记录表（每次共享插入一行）
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS share_record (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transfer_id INTEGER NOT NULL,
            ip TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
    )
    .execute(get_pool())
    .await
    .unwrap();

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_share_record_transfer ON share_record(transfer_id)",
    )
    .execute(get_pool())
    .await
    .unwrap();

    // 兼容旧表结构：最近一次共享 IP（先加列再回填）
    if let Err(e) = sqlx::query("ALTER TABLE transfer_record ADD COLUMN last_share_ip TEXT").execute(get_pool()).await {
        let msg = e.to_string().to_lowercase();
        if !msg.contains("duplicate column") {
            panic!("数据库迁移失败(last_share_ip): {}", e);
        }
    }
    // 已有记录回填：最近共享 IP 用原 ip 兜底
    sqlx::query("UPDATE transfer_record SET last_share_ip = ip WHERE last_share_ip IS NULL")
        .execute(get_pool()).await.unwrap();

    // 为已有的文本(1)/图片(5)记录回填一条初始共享历史
    backfill_share_records().await;
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

/// 为已有文本(1)/图片(5)记录回填一条初始共享历史记录
async fn backfill_share_records() {
    // 检查 share_record 是否已有数据（避免重复回填）
    let share_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM share_record")
        .fetch_one(get_pool())
        .await
        .unwrap_or((0,));

    if share_count.0 > 0 {
        return;
    }

    // 为每条文本/图片记录回填一条初始共享记录（用记录的 ip 和创建时间）
    let result = sqlx::query(
        "INSERT INTO share_record (transfer_id, ip, created_at)
         SELECT id, ip, COALESCE(created_at, datetime('now','localtime')) FROM transfer_record WHERE action_type IN (1, 5)",
    )
    .execute(get_pool())
    .await;

    match result {
        Ok(res) => log::info!("已回填 {} 条初始共享历史记录", res.rows_affected()),
        Err(e) => log::error!("回填共享历史记录失败: {}", e),
    }
}
