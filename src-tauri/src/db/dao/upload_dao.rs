use crate::db::entity::UploadRecord;
use crate::db::sqlite::get_pool;
use sqlx::Error;

/// 新增分享记录
pub async fn add(upload_type: i64, content: &str, ip: &str, is_overwrite: bool) -> Result<i64, sqlx::Error> {
    let result =
        sqlx::query("INSERT INTO upload_record (upload_type, content, ip, is_overwrite) VALUES (?, ?, ?, ?)")
            .bind(upload_type)
            .bind(content)
            .bind(ip)
            .bind(if is_overwrite { 1 } else { 0 })
            .execute(get_pool())
            .await?;

    Ok(result.last_insert_rowid())
}

/// 删除分享记录
pub async fn remove(id: i64) -> Result<u64, sqlx::Error> {
    let result = sqlx::query("DELETE FROM upload_record WHERE id = ?")
        .bind(id)
        .execute(get_pool())
        .await?;

    Ok(result.rows_affected())
}

/// 按类型删除所有分享记录
pub async fn remove_all(upload_type: i64) -> Result<u64, sqlx::Error> {
    let result = sqlx::query("DELETE FROM upload_record WHERE upload_type = ?")
        .bind(upload_type)
        .execute(get_pool())
        .await?;

    Ok(result.rows_affected())
}

/// 根据类型查询分享记录
pub async fn list_by_type(upload_type: i64) -> Result<Vec<UploadRecord>, Error> {
    sqlx::query_as("SELECT id, upload_type, content, ip, is_overwrite, created_at FROM upload_record WHERE upload_type = ? ORDER BY created_at DESC")
        .bind(upload_type)
        .fetch_all(get_pool())
        .await
}

/// 查询记录总数
pub async fn count() -> Result<i64, Error> {
    let result: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM upload_record")
        .fetch_one(get_pool())
        .await?;
    Ok(result.0)
}

/// 查询所有上传记录
pub async fn list_all() -> Result<Vec<UploadRecord>, Error> {
    sqlx::query_as("SELECT id, upload_type, content, ip, is_overwrite, created_at FROM upload_record ORDER BY created_at DESC")
        .fetch_all(get_pool())
        .await
}