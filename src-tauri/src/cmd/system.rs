use crate::db::dao::upload_dao;
use crate::db::sqlite::get_pool;
use std::net::IpAddr;

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

/// 获取文本共享历史记录
#[tauri::command]
pub async fn get_text_sharing_history() -> Result<Vec<crate::db::entity::UploadRecord>, String> {
    match upload_dao::list_by_type(1).await {
        Ok(records) => Ok(records),
        Err(err) => {
            log::error!("获取文本共享历史记录失败: {}", err);
            Err(err.to_string())
        }
    }
}

/// 删除指定的文本共享记录
#[tauri::command]
pub async fn delete_text_sharing_record(id: i64) -> Result<u64, String> {
    match upload_dao::remove(id).await {
        Ok(count) => Ok(count),
        Err(err) => {
            log::error!("删除文本共享记录失败: {}", err);
            Err(err.to_string())
        }
    }
}

/// 分享文本到局域网
#[tauri::command]
pub async fn share_text_to_lan(text_data: String) -> Result<(), String> {
    // 获取本地IP地址作为客户端IP
    let local_ip = local_ip_address::local_ip().unwrap().to_string();
    
    log::info!("来自[{}]的文本：{}", local_ip, text_data);
    
    // 将文本保存到数据库
    match upload_dao::add(1, &text_data, &local_ip).await {
        Ok(_) => {
            log::info!("文本分享成功");
            Ok(())
        },
        Err(err) => {
            log::error!("文本分享失败: {}", err);
            Err(err.to_string())
        }
    }
}
