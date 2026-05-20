use crate::db::dao::config_dao;
use crate::db::dao::upload_dao;

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
        }
        Err(err) => {
            log::error!("文本分享失败: {}", err);
            Err(err.to_string())
        }
    }
}

/// 设置共享根目录
#[tauri::command]
pub async fn set_sharing_directory(directory_path: String) -> Result<(), String> {
    use crate::config::config;
    use crate::db::dao::config_dao;
    use std::path::PathBuf;

    let path = PathBuf::from(directory_path);

    // 验证路径是否有效
    if !path.exists() {
        return Err("路径不存在".to_string());
    }

    if !path.is_dir() {
        return Err("请选择一个有效的目录".to_string());
    }

    // 保存到数据库配置
    if let Err(e) =
        config_dao::set_config("file_sharing_root_dir", path.to_str().unwrap_or("")).await
    {
        log::error!("保存共享根目录到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }

    // 更新全局共享根目录
    if let Err(e) = config::set_sharing_root_new(path).await {
        log::error!("设置共享根目录失败: {}", e);
        return Err(e);
    }

    let sharing_root = config::get_sharing_root().await;
    log::info!("共享根目录已设置为: {:?}", (*sharing_root));
    Ok(())
}

/// 获取当前共享根目录
#[tauri::command]
pub async fn get_sharing_directory() -> Result<String, String> {
    use crate::config::config;
    use crate::db::dao::config_dao;

    // 首先尝试从数据库获取
    match config_dao::get_config_value("file_sharing_root_dir").await {
        Ok(Some(path)) => Ok(path),
        Ok(None) => {
            // 如果数据库中没有配置，返回当前的全局配置
            let sharing_root = config::get_sharing_root().await;
            log::info!("当前配置: {:?}", (*sharing_root));
            Ok((*sharing_root).to_string_lossy().to_string())
        }
        Err(e) => {
            log::warn!("获取共享根目录配置失败: {}", e);
            // 返回当前的全局配置
            let sharing_root = config::get_sharing_root().await;
            Ok((*sharing_root).to_string_lossy().to_string())
        }
    }
}

/// 获取上传设置状态
#[tauri::command]
pub async fn get_upload_enabled() -> Result<bool, String> {
    match config_dao::get_config_value("upload_enabled").await {
        Ok(Some(value)) => {
            // 尝试将字符串值转换为布尔值
            let enabled = value.parse::<bool>().unwrap_or(false);
            Ok(enabled)
        }
        Ok(None) => {
            // 如果配置不存在，默认禁止上传
            Ok(false)
        }
        Err(e) => {
            log::warn!("获取上传设置失败: {}", e);
            // 出错时默认禁止上传
            Ok(false)
        }
    }
}

/// 设置上传状态
#[tauri::command]
pub async fn set_upload_enabled(enabled: bool) -> Result<(), String> {
    let value = if enabled { "true" } else { "false" };

    if let Err(e) = config_dao::set_config("upload_enabled", value).await {
        log::error!("保存上传设置到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }

    log::info!("上传设置已更新为: {}", enabled);
    Ok(())
}
