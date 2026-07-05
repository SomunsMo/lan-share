use serde::Serialize;
use sqlx::FromRow;

#[derive(Serialize, FromRow)]
pub struct Config {
    pub id: i64,
    pub cfg_key: String,
    pub cfg_value: String,
    pub created_at: String,
}

// 传输记录表
#[derive(Serialize, FromRow)]
pub struct TransferRecord {
    pub(crate) id: i64,
    pub(crate) action_type: i64,
    pub(crate) content: String,
    pub(crate) source_id: Option<i64>,
    pub(crate) ip: String,
    pub(crate) is_overwrite: i64,
    pub(crate) created_at: String,
}
