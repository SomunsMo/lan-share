//! 配置的DAO层

use crate::db::entity::Config;
use crate::db::sqlite::get_pool;
use chrono::Local;
use sqlx::Error;
use sqlx::Row;

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

/// 批量获取配置值（一次查询，减少 DB 往返）
pub async fn get_config_values(keys: &[&str]) -> std::collections::HashMap<String, String> {
    if keys.is_empty() {
        return std::collections::HashMap::new();
    }
    let placeholders: Vec<String> = keys.iter().map(|_| "?".to_string()).collect();
    let sql = format!(
        "SELECT cfg_key, cfg_value FROM config WHERE cfg_key IN ({})",
        placeholders.join(",")
    );
    let mut query = sqlx::query(&sql);
    for key in keys {
        query = query.bind(key);
    }
    let rows = query.fetch_all(get_pool()).await.unwrap_or_default();
    let map: std::collections::HashMap<String, String> = rows
        .into_iter()
        .map(|row| {
            let k: String = row.get("cfg_key");
            let v: String = row.get("cfg_value");
            (k, v)
        })
        .collect();
    log::info!("[get_config_values] keys={:?}, found={}", keys, map.len());
    map
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
