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

/// 分页查询（支持游标、搜索、排序、类型过滤）
/// 返回 (records, has_more)
pub async fn query_paginated(
    cursor_id: Option<i64>,
    limit: i64,
    search: Option<&str>,
    sort_order: &str,
    action_types: Option<&[i64]>,
) -> Result<(Vec<TransferRecord>, bool), Error> {
    let mut conditions: Vec<String> = Vec::new();

    // 类型过滤
    match action_types {
        Some(types) if !types.is_empty() => {
            let placeholders: Vec<String> = types.iter().map(|_| "?".to_string()).collect();
            conditions.push(format!("action_type IN ({})", placeholders.join(",")));
        }
        _ => {
            conditions.push("action_type != 3".to_string());
        }
    }

    // 游标
    if cursor_id.is_some() {
        if sort_order == "asc" {
            conditions.push("id > ?".to_string());
        } else {
            conditions.push("id < ?".to_string());
        }
    }

    // 搜索
    let has_search = search.is_some_and(|s| !s.is_empty());
    if has_search {
        conditions.push("content LIKE ?".to_string());
    }

    let where_clause = format!("WHERE {}", conditions.join(" AND "));
    let order = if sort_order == "asc" { "ASC" } else { "DESC" };

    let sql = format!(
        "SELECT id, action_type, content, source_id, ip, is_overwrite, created_at \
         FROM transfer_record {} ORDER BY created_at {}, id {} LIMIT ?",
        where_clause, order, order
    );

    let mut query = sqlx::query_as::<_, TransferRecord>(&sql);

    if let Some(types) = action_types {
        for &t in types {
            query = query.bind(t);
        }
    }

    if let Some(cid) = cursor_id {
        query = query.bind(cid);
    }

    if has_search {
        query = query.bind(format!("%{}%", search.unwrap()));
    }

    // 多取一条判断是否有更多数据
    query = query.bind(limit + 1);

    let records = query.fetch_all(get_pool()).await?;

    let has_more = records.len() > limit as usize;
    let records = if has_more {
        records.into_iter().take(limit as usize).collect()
    } else {
        records
    };

    Ok((records, has_more))
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
