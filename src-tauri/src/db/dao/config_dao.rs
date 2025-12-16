//! 配置的DAO层

use crate::db::entity::Config;
use crate::db::sqlite::get_pool;
use sqlx::Error;

/// 获取配置
pub async fn get_config(key: &str) -> Result<Config, Error> {
    sqlx::query_as("SELECT * FROM config WHERE cfg_key = ?")
        .bind(key)
        .fetch_one(get_pool())
        .await
}
