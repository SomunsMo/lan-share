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

/// 更新配置
async fn update_config(key: &str, value: &str, timestamp: &str) -> Result<(), Error> {
    let result = sqlx::query("UPDATE config SET cfg_value = ?, created_at = ? WHERE cfg_key = ?")
        .bind(value)
        .bind(timestamp)
        .bind(key)
        .execute(get_pool())
        .await;

    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(e),
    }
}

/// 设置配置
pub async fn set_config(key: &str, value: &str) -> Result<(), Error> {
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // 检查配置是否存在
    let exists_result = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM config WHERE cfg_key = ?)")
        .bind(key)
        .fetch_one(get_pool())
        .await;

    match exists_result {
        Ok(exists) => {
            if exists {
                // 如果存在，则更新
                update_config(key, value, &now).await
            } else {
                // 如果不存在，则插入
                let result = sqlx::query(
                    "INSERT INTO config (cfg_key, cfg_value, created_at) VALUES (?, ?, ?)",
                )
                .bind(key)
                .bind(value)
                .bind(&now)
                .execute(get_pool())
                .await;

                match result {
                    Ok(_) => Ok(()),
                    Err(e) => Err(e),
                }
            }
        }
        Err(e) => Err(e),
    }
}
