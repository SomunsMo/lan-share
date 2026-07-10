//! 配置的DAO层

use crate::db::entity::Config;
use crate::db::sqlite::get_pool;
use chrono::Local;
use sqlx::Error;

/// 获取配置
pub async fn get_config(key: &str) -> Result<Config, Error> {
    sqlx::query_as::<_, Config>("SELECT * FROM config WHERE cfg_key = ?")
        .bind(key)
        .fetch_one(get_pool())
        .await
}

/// 根据键获取配置值
pub async fn get_config_value(key: &str) -> Result<Option<String>, Error> {
    match sqlx::query_as::<_, Config>("SELECT * FROM config WHERE cfg_key = ?")
        .bind(key)
        .fetch_optional(get_pool())
        .await
    {
        Ok(Some(config)) => Ok(Some(config.cfg_value)),
        Ok(None) => Ok(None),
        Err(e) => Err(e),
    }
}

/// 设置配置（使用 UPSERT，依赖 cfg_key 上的 UNIQUE 约束）
pub async fn set_config(key: &str, value: &str) -> Result<(), Error> {
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    sqlx::query(
        "INSERT INTO config (cfg_key, cfg_value, created_at) VALUES (?, ?, ?) \
         ON CONFLICT(cfg_key) DO UPDATE SET cfg_value = excluded.cfg_value, created_at = excluded.created_at",
    )
    .bind(key)
    .bind(value)
    .bind(&now)
    .execute(get_pool())
    .await?;
    Ok(())
}
