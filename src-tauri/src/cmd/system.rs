use crate::db::dao::config_dao;
use crate::db::dao::upload_dao;
use serde::Serialize;

#[derive(Serialize)]
pub struct ServerStatus {
    pub running: bool,
    pub port: u16,
    pub reason: String,
}

/// 获取本机内网IP
#[tauri::command]
pub fn get_local_ip() -> String {
    local_ip_address::local_ip().unwrap().to_string()
}

/// 获取设备名称
#[tauri::command]
pub fn get_device_name() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "Unknown Device".to_string())
}

/// 清空共享文本记录（同时清空关联的复制记录）
#[tauri::command]
pub async fn clear_sharing_text() -> u64 {
    let result_count = upload_dao::remove_by_types(&[1, 3]).await.unwrap_or(0);
    log::info!("清空共享文本和复制记录{}条", result_count);
    result_count
}

/// 获取文本共享历史记录
#[tauri::command]
pub async fn get_text_sharing_history() -> Result<Vec<crate::db::entity::TransferRecord>, String> {
    match upload_dao::list_by_type(1).await {
        Ok(records) => Ok(records),
        Err(err) => {
            log::error!("获取文本共享历史记录失败: {}", err);
            Err(err.to_string())
        }
    }
}

/// 删除指定的文本共享记录（级联删除关联的复制记录）
#[tauri::command]
pub async fn delete_text_sharing_record(id: i64) -> Result<u64, String> {
    match upload_dao::remove_text_cascade(id).await {
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
    match upload_dao::add(1, &text_data, None, &local_ip, false).await {
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

/// 检查共享根目录是否已配置（首次运行检测）
#[tauri::command]
pub fn is_sharing_root_configured() -> bool {
    crate::config::config::is_sharing_root_configured()
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

    // 保存到数据库配置（统一正斜杠）
    if let Err(e) =
        config_dao::set_config("file_sharing_root_dir", &crate::utils::path::normalize_path(&path)).await
    {
        log::error!("保存共享根目录到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }

    // 更新全局共享根目录
    if let Err(e) = config::set_sharing_root_new(path).await {
        log::error!("设置共享根目录失败: {}", e);
        return Err(e);
    }

    // 标记为已配置
    config::set_sharing_root_configured(true);

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
            log::info!("当前配置: {}", crate::utils::path::normalize_path(&(*sharing_root)));
            Ok(crate::utils::path::normalize_path(&(*sharing_root)))
        }
        Err(e) => {
            log::warn!("获取共享根目录配置失败: {}", e);
            // 返回当前的全局配置
            let sharing_root = config::get_sharing_root().await;
            Ok(crate::utils::path::normalize_path(&(*sharing_root)))
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

/// 获取重命名设置状态
#[tauri::command]
pub async fn get_rename_enabled() -> Result<bool, String> {
    match config_dao::get_config_value("rename_enabled").await {
        Ok(Some(value)) => {
            let enabled = value.parse::<bool>().unwrap_or(false);
            Ok(enabled)
        }
        Ok(None) => Ok(false),
        Err(e) => {
            log::warn!("获取重命名设置失败: {}", e);
            Ok(false)
        }
    }
}

/// 设置重命名状态
#[tauri::command]
pub async fn set_rename_enabled(enabled: bool) -> Result<(), String> {
    let value = if enabled { "true" } else { "false" };

    if let Err(e) = config_dao::set_config("rename_enabled", value).await {
        log::error!("保存重命名设置到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }

    log::info!("重命名设置已更新为: {}", enabled);
    Ok(())
}

/// 获取删除设置状态
#[tauri::command]
pub async fn get_delete_enabled() -> Result<bool, String> {
    match config_dao::get_config_value("delete_enabled").await {
        Ok(Some(value)) => {
            let enabled = value.parse::<bool>().unwrap_or(false);
            Ok(enabled)
        }
        Ok(None) => Ok(false),
        Err(e) => {
            log::warn!("获取删除设置失败: {}", e);
            Ok(false)
        }
    }
}

/// 设置删除状态
#[tauri::command]
pub async fn set_delete_enabled(enabled: bool) -> Result<(), String> {
    let value = if enabled { "true" } else { "false" };

    if let Err(e) = config_dao::set_config("delete_enabled", value).await {
        log::error!("保存删除设置到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }

    log::info!("删除设置已更新为: {}", enabled);
    Ok(())
}

/// 获取上传覆盖设置状态
#[tauri::command]
pub async fn get_upload_overwrite_enabled() -> Result<bool, String> {
    match config_dao::get_config_value("upload_overwrite_enabled").await {
        Ok(Some(value)) => {
            let enabled = value.parse::<bool>().unwrap_or(false);
            Ok(enabled)
        }
        Ok(None) => Ok(false),
        Err(e) => {
            log::warn!("获取上传覆盖设置失败: {}", e);
            Ok(false)
        }
    }
}

/// 设置上传覆盖状态
#[tauri::command]
pub async fn set_upload_overwrite_enabled(enabled: bool) -> Result<(), String> {
    let value = if enabled { "true" } else { "false" };

    if let Err(e) = config_dao::set_config("upload_overwrite_enabled", value).await {
        log::error!("保存上传覆盖设置到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }

    log::info!("上传覆盖设置已更新为: {}", enabled);
    Ok(())
}

/// 获取开机自启状态
#[tauri::command]
pub async fn get_autostart(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

/// 设置开机自启状态
#[tauri::command]
pub async fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    if enabled {
        app.autolaunch().enable().map_err(|e| e.to_string())?;
    } else {
        app.autolaunch().disable().map_err(|e| e.to_string())?;
    }
    log::info!("开机自启已更新为: {}", enabled);
    Ok(())
}

/// 获取HTTP服务配置端口（可能还未生效，重启后才生效）
#[tauri::command]
pub async fn get_http_port() -> Result<u16, String> {
    match config_dao::get_config_value("http_port").await {
        Ok(Some(value)) => {
            let port = value.parse::<u16>().unwrap_or(3000);
            Ok(port)
        }
        Ok(None) => Ok(3000),
        Err(e) => {
            log::warn!("获取HTTP端口设置失败: {}", e);
            Ok(3000)
        }
    }
}

/// 获取当前HTTP服务正在运行的端口
#[tauri::command]
pub fn get_running_port() -> u16 {
    *crate::config::config::get_running_http_port()
}

/// 获取HTTP服务器运行状态（前端主动查询）
#[tauri::command]
pub fn get_server_status() -> ServerStatus {
    let port = *crate::config::config::get_running_http_port();
    match crate::config::config::OCCUPIED_PORT.get() {
        Some(p) => ServerStatus {
            running: false,
            port: *p,
            reason: "port_occupied".to_string(),
        },
        None => ServerStatus {
            running: true,
            port,
            reason: String::new(),
        },
    }
}

/// 设置HTTP服务端口
#[tauri::command]
pub async fn set_http_port(port: u16) -> Result<(), String> {
    // u16类型范围是 0-65535，所以不用判断是否超出
    if port < 1 {
        return Err("端口号必须在 1-65535 之间".to_string());
    }

    if let Err(e) = config_dao::set_config("http_port", &port.to_string()).await {
        log::error!("保存HTTP端口设置到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }

    log::info!("HTTP端口设置已更新为: {}", port);
    Ok(())
}

/// 清空文件上传记录（同时清空关联的下载记录）
#[tauri::command]
pub async fn clear_sharing_file() -> u64 {
    let result_count = upload_dao::remove_by_types(&[2, 4]).await.unwrap_or(0);
    log::info!("清空文件和下载记录{}条", result_count);
    result_count
}

/// 获取文件上传历史记录
#[tauri::command]
pub async fn get_file_sharing_history() -> Result<Vec<crate::db::entity::TransferRecord>, String> {
    match upload_dao::list_by_type(2).await {
        Ok(records) => Ok(records),
        Err(err) => {
            log::error!("获取文件上传历史记录失败: {}", err);
            Err(err.to_string())
        }
    }
}

/// 删除指定的文件上传记录（不关联下载记录）
#[tauri::command]
pub async fn delete_file_sharing_record(id: i64) -> Result<u64, String> {
    match upload_dao::remove(id).await {
        Ok(count) => Ok(count),
        Err(err) => {
            log::error!("删除文件上传记录失败: {}", err);
            Err(err.to_string())
        }
    }
}

/// 获取所有历史记录（排除复制记录）
#[tauri::command]
pub async fn get_all_upload_history() -> Result<Vec<crate::db::entity::TransferRecord>, String> {
    match upload_dao::list_all().await {
        Ok(records) => {
            // 过滤掉复制记录（action_type=3），它们通过子弹窗查看
            let filtered: Vec<_> = records.into_iter().filter(|r| r.action_type != 3).collect();
            Ok(filtered)
        }
        Err(err) => {
            log::error!("获取所有历史记录失败: {}", err);
            Err(err.to_string())
        }
    }
}

/// 获取指定文本记录的复制记录
#[tauri::command]
pub async fn get_copy_records(source_id: i64) -> Result<Vec<crate::db::entity::TransferRecord>, String> {
    match upload_dao::list_copies_by_source(source_id).await {
        Ok(records) => Ok(records),
        Err(err) => {
            log::error!("获取复制记录失败: {}", err);
            Err(err.to_string())
        }
    }
}

// ===== 记录开关设置 =====

/// 获取复制记录开关
#[tauri::command]
pub async fn get_record_copy_enabled() -> Result<bool, String> {
    match config_dao::get_config_value("record_copy_enabled").await {
        Ok(Some(value)) => Ok(value.parse::<bool>().unwrap_or(false)),
        Ok(None) => Ok(false),
        Err(e) => {
            log::warn!("获取复制记录设置失败: {}", e);
            Ok(false)
        }
    }
}

/// 设置复制记录开关
#[tauri::command]
pub async fn set_record_copy_enabled(enabled: bool) -> Result<(), String> {
    let value = if enabled { "true" } else { "false" };
    if let Err(e) = config_dao::set_config("record_copy_enabled", value).await {
        log::error!("保存复制记录设置失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }
    log::info!("复制记录设置已更新为: {}", enabled);
    Ok(())
}

/// 获取下载记录开关
#[tauri::command]
pub async fn get_record_download_enabled() -> Result<bool, String> {
    match config_dao::get_config_value("record_download_enabled").await {
        Ok(Some(value)) => Ok(value.parse::<bool>().unwrap_or(false)),
        Ok(None) => Ok(false),
        Err(e) => {
            log::warn!("获取下载记录设置失败: {}", e);
            Ok(false)
        }
    }
}

/// 设置下载记录开关
#[tauri::command]
pub async fn set_record_download_enabled(enabled: bool) -> Result<(), String> {
    let value = if enabled { "true" } else { "false" };
    if let Err(e) = config_dao::set_config("record_download_enabled", value).await {
        log::error!("保存下载记录设置失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }
    log::info!("下载记录设置已更新为: {}", enabled);
    Ok(())
}

/// 在文件管理器中打开文件位置
#[tauri::command]
pub async fn open_file_location(filename: String) -> Result<(), String> {
    // content 存储的是绝对路径，直接使用即可
    let full_path = std::path::PathBuf::from(&filename);

    if !full_path.exists() {
        log::warn!("文件不存在: {}", filename);
        return Err(format!("文件不存在: {}", filename));
    }

    let result = if cfg!(target_os = "windows") {
        // Windows explorer 需要使用反斜杠
        let win_path = full_path.to_string_lossy().replace('/', "\\");
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&win_path)
            .spawn()
    } else if cfg!(target_os = "macos") {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&full_path)
            .spawn()
    } else {
        // Linux: open parent directory
        let parent = full_path.parent().unwrap_or(&full_path);
        std::process::Command::new("xdg-open")
            .arg(parent)
            .spawn()
    };

    match result {
        Ok(_) => Ok(()),
        Err(e) => {
            log::error!("无法打开文件位置: {}", e);
            Err(format!("无法打开文件位置: {}", e))
        }
    }
}

/// 在文件管理器中打开文件夹
#[tauri::command]
pub async fn open_folder(path: String) -> Result<(), String> {
    let full_path = std::path::PathBuf::from(&path);

    if !full_path.exists() || !full_path.is_dir() {
        log::warn!("文件夹不存在: {}", path);
        return Err(format!("文件夹不存在: {}", path));
    }

    let result = if cfg!(target_os = "windows") {
        let win_path = full_path.to_string_lossy().replace('/', "\\");
        std::process::Command::new("explorer")
            .arg(&win_path)
            .spawn()
    } else if cfg!(target_os = "macos") {
        std::process::Command::new("open")
            .arg(&full_path)
            .spawn()
    } else {
        std::process::Command::new("xdg-open")
            .arg(&full_path)
            .spawn()
    };

    match result {
        Ok(_) => Ok(()),
        Err(e) => {
            log::error!("无法打开文件夹: {}", e);
            Err(format!("无法打开文件夹: {}", e))
        }
    }
}

/// 获取语言设置
#[tauri::command]
pub async fn get_language() -> Result<String, String> {
    match config_dao::get_config_value("language").await {
        Ok(Some(value)) => Ok(value),
        Ok(None) => Ok(String::new()),
        Err(e) => {
            log::warn!("获取语言设置失败: {}", e);
            Ok(String::new())
        }
    }
}

/// 设置语言
#[tauri::command]
pub async fn set_language(language: String) -> Result<(), String> {
    if let Err(e) = config_dao::set_config("language", &language).await {
        log::error!("保存语言设置到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }
    log::info!("语言设置已更新为: {}", language);
    Ok(())
}

/// 获取主题设置
#[tauri::command]
pub async fn get_theme_setting() -> Result<String, String> {
    match config_dao::get_config_value("theme_setting").await {
        Ok(Some(value)) => Ok(value),
        Ok(None) => Ok("system".to_string()),
        Err(e) => {
            log::warn!("获取主题设置失败: {}", e);
            Ok("system".to_string())
        }
    }
}

/// 设置主题
#[tauri::command]
pub async fn set_theme_setting(theme: String) -> Result<(), String> {
    if theme != "system" && theme != "light" && theme != "dark" {
        return Err("无效的主题设置".to_string());
    }
    if let Err(e) = config_dao::set_config("theme_setting", &theme).await {
        log::error!("保存主题设置到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }
    log::info!("主题设置已更新为: {}", theme);
    Ok(())
}
