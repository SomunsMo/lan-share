use crate::db::dao::upload_dao;
use crate::db::sqlite::get_pool;

/// 获取本机内网IP
#[tauri::command]
pub fn get_local_ip() -> String {
    local_ip_address::local_ip().unwrap().to_string()
}

/// 清空共享文本记录
#[tauri::command]
pub async fn clear_sharing_text() -> u64 {
    let result_count = upload_dao::remove_all(1).await.unwrap_or(0);
    log::info!("清空共享文本记录{}条", result_count);
    result_count
}
