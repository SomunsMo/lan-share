use crate::db::entity::TransferRecord;
use crate::db::sqlite::get_pool;
use sqlx::Error;

/// 新增记录
pub async fn add(
    action_type: i64,
    content: &str,
    source_id: Option<i64>,
    ip: &str,
    is_overwrite: bool,
) -> Result<i64, sqlx::Error> {
    let result = sqlx::query(
        "INSERT INTO transfer_record (action_type, content, source_id, ip, is_overwrite) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(action_type)
    .bind(content)
    .bind(source_id)
    .bind(ip)
    .bind(if is_overwrite { 1 } else { 0 })
    .execute(get_pool())
    .await?;

    Ok(result.last_insert_rowid())
}

/// 删除单条记录
pub async fn remove(id: i64) -> Result<u64, sqlx::Error> {
    let result = sqlx::query("DELETE FROM transfer_record WHERE id = ?")
        .bind(id)
        .execute(get_pool())
        .await?;

    Ok(result.rows_affected())
}

/// 级联删除文本记录及关联的复制记录
pub async fn remove_text_cascade(id: i64) -> Result<u64, sqlx::Error> {
    // 先删关联的复制记录
    let _ = sqlx::query("DELETE FROM transfer_record WHERE action_type = 3 AND source_id = ?")
        .bind(id)
        .execute(get_pool())
        .await?;
    // 再删主记录
    let result = sqlx::query("DELETE FROM transfer_record WHERE action_type = 1 AND id = ?")
        .bind(id)
        .execute(get_pool())
        .await?;
    Ok(result.rows_affected())
}

/// 按 action_type 范围删除
pub async fn remove_by_types(types: &[i64]) -> Result<u64, sqlx::Error> {
    if types.is_empty() {
        return Ok(0);
    }
    let placeholders: Vec<String> = types.iter().map(|_| "?".to_string()).collect();
    let sql = format!(
        "DELETE FROM transfer_record WHERE action_type IN ({})",
        placeholders.join(",")
    );
    let mut query = sqlx::query(&sql);
    for t in types {
        query = query.bind(t);
    }
    let result = query.execute(get_pool()).await?;
    Ok(result.rows_affected())
}

/// 根据 action_type 查询记录
pub async fn list_by_type(action_type: i64) -> Result<Vec<TransferRecord>, Error> {
    sqlx::query_as(
        "SELECT id, action_type, content, source_id, ip, is_overwrite, created_at
         FROM transfer_record WHERE action_type = ? ORDER BY created_at DESC",
    )
    .bind(action_type)
    .fetch_all(get_pool())
    .await
}

/// 查询记录总数
pub async fn count() -> Result<i64, Error> {
    let result: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM transfer_record")
        .fetch_one(get_pool())
        .await?;
    Ok(result.0)
}

/// 查询所有记录
pub async fn list_all() -> Result<Vec<TransferRecord>, Error> {
    sqlx::query_as(
        "SELECT id, action_type, content, source_id, ip, is_overwrite, created_at
         FROM transfer_record ORDER BY created_at DESC",
    )
    .fetch_all(get_pool())
    .await
}

/// 根据 id 获取单条记录
pub async fn get_by_id(id: i64) -> Result<Option<TransferRecord>, Error> {
    sqlx::query_as(
        "SELECT id, action_type, content, source_id, ip, is_overwrite, created_at
         FROM transfer_record WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(get_pool())
    .await
}

/// 查询某条文本记录的复制记录
pub async fn list_copies_by_source(source_id: i64) -> Result<Vec<TransferRecord>, Error> {
    sqlx::query_as(
        "SELECT id, action_type, content, source_id, ip, is_overwrite, created_at
         FROM transfer_record WHERE action_type = 3 AND source_id = ? ORDER BY created_at DESC",
    )
    .bind(source_id)
    .fetch_all(get_pool())
    .await
}
