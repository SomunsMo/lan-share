use serde::Serialize;
use sqlx::FromRow;

#[derive(Serialize, FromRow)]
pub struct Config {
    pub id: i64,
    pub cfg_key: String,
    pub cfg_value: String,
    pub created_at: String,
}

// 文件上传表
#[derive(Serialize, FromRow)]
pub struct UploadRecord {
    pub(crate) id: i64,
    pub(crate) upload_type: i64,
    pub(crate) content: String,
    pub(crate) ip: String,
    pub(crate) created_at: String,
}
