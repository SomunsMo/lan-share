use crate::db::dao::config_dao;
use crate::db::dao::upload_dao;
use serde::Serialize;
use std::error::Error;

#[derive(Serialize)]
pub struct PaginatedResult {
    pub records: Vec<crate::db::entity::TransferRecord>,
    pub has_more: bool,
}

#[derive(Serialize)]
pub struct ServerStatus {
    pub running: bool,
    pub port: u16,
    pub reason: String,
}

#[derive(Serialize)]
pub struct AllSettings {
    pub sharing_directory: String,
    pub upload_enabled: bool,
    pub rename_enabled: bool,
    pub delete_enabled: bool,
    pub upload_overwrite_enabled: bool,
    pub record_copy_enabled: bool,
    pub record_download_enabled: bool,
    pub autostart: bool,
    pub autostart_minimized: bool,
    pub http_port: u16,
    pub theme_setting: String,
    pub theme_color: String,
    pub language: String,
    pub exclude_system_files: bool,
    pub exclude_patterns: Vec<String>,
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
        // 启用后根据最小化设置追加参数
        let minimized = get_autostart_minimized_inner().await.unwrap_or(false);
        update_autostart_args(minimized);
    } else {
        app.autolaunch().disable().map_err(|e| e.to_string())?;
    }
    log::info!("开机自启已更新为: {}", enabled);
    Ok(())
}

/// 获取开机最小化启动状态
#[tauri::command]
pub async fn get_autostart_minimized() -> Result<bool, String> {
    get_autostart_minimized_inner().await.map_err(|e| e.to_string())
}

async fn get_autostart_minimized_inner() -> Result<bool, sqlx::Error> {
    match config_dao::get_config_value("autostart_minimized").await {
        Ok(Some(val)) => Ok(val == "true"),
        Ok(None) => Ok(false),
        Err(e) => Err(e),
    }
}

/// 设置开机最小化启动状态
#[tauri::command]
pub async fn set_autostart_minimized(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let value = if enabled { "true" } else { "false" };
    config_dao::set_config("autostart_minimized", value)
        .await
        .map_err(|e| e.to_string())?;

    // 如果开机自启已启用，同步更新 autostart 命令行参数
    use tauri_plugin_autostart::ManagerExt;
    if app.autolaunch().is_enabled().unwrap_or(false) {
        update_autostart_args(enabled);
    }

    log::info!("开机最小化启动已更新为: {}", enabled);
    Ok(())
}

/// 更新 autostart 命令行参数
fn update_autostart_args(minimized: bool) {
    #[cfg(target_os = "windows")]
    {
        let arg = "--silent";
        let exe = std::env::current_exe().ok();
        let exe_path = match &exe {
            Some(p) => p.to_string_lossy().to_string(),
            None => return,
        };
        use winreg::enums::*;
        use winreg::RegKey;
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok(run) = hkcu.open_subkey_with_flags(
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            KEY_READ | KEY_SET_VALUE,
        ) {
            let key_name = "LAN Share";
            if minimized {
                let value = format!("\"{}\" {}", exe_path, arg);
                let _ = run.set_value(key_name, &value);
            } else {
                let value = format!("\"{}\"", exe_path);
                let _ = run.set_value(key_name, &value);
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let label = "LAN Share";
        let exe = std::env::current_exe().ok();
        let exe_path = match &exe {
            Some(p) => p.to_string_lossy().to_string(),
            None => return,
        };
        let plist_path = dirs::home_dir()
            .map(|h| h.join(format!("Library/LaunchAgents/{}.plist", label)));
        if let Some(path) = plist_path {
            if path.exists() {
                let args = if minimized {
                    format!(
                        "  <array><string>{}</string><string>--silent</string></array>",
                        exe_path
                    )
                } else {
                    format!("  <array><string>{}</string></array>", exe_path)
                };
                let content = format!(
                    r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
  <key>Label</key>
  <string>{}</string>
  <key>ProgramArguments</key>
{}
  <key>RunAtLoad</key>
  <true/>
  </dict>
</plist>
"#,
                    label, args
                );
                let _ = std::fs::write(&path, content);
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let arg = "--silent";
        let desktop_name = "lan-share.desktop";
        let desktop_path = dirs::data_dir()
            .map(|d| d.join("autostart").join(desktop_name));
        if let Some(path) = desktop_path {
            if path.exists() {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    let new_content = if minimized {
                        if content.contains(arg) {
                            content
                        } else {
                            content.replace("Exec=", &format!("Exec={} ", arg))
                        }
                    } else {
                        content.replace(&format!(" {} ", arg), " ")
                            .replace(&format!("{}", arg), "")
                    };
                    let _ = std::fs::write(&path, new_content);
                }
            }
        }
    }
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

/// 分页查询历史记录（支持游标、搜索、排序、类型过滤）
#[tauri::command]
pub async fn get_transfer_log(
    cursor_id: Option<i64>,
    limit: Option<i64>,
    search: Option<String>,
    sort_order: Option<String>,
    action_types: Option<Vec<i64>>,
) -> Result<PaginatedResult, String> {
    let limit = limit.unwrap_or(20);
    let sort_order = sort_order.unwrap_or_else(|| "desc".to_string());
    let action_types_ref = action_types.as_deref();

    match upload_dao::query_paginated(
        cursor_id,
        limit,
        search.as_deref(),
        &sort_order,
        action_types_ref,
    )
    .await
    {
        Ok((records, has_more)) => Ok(PaginatedResult { records, has_more }),
        Err(err) => {
            log::error!("分页查询历史记录失败: {}", err);
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

/// 获取主题色设置（JSON: {"h":218,"s":100,"l":39}）
#[tauri::command]
pub async fn get_theme_color() -> Result<String, String> {
    match config_dao::get_config_value("theme_color").await {
        Ok(Some(value)) => Ok(value),
        Ok(None) => Ok("{\"h\":210,\"s\":100,\"l\":40}".to_string()),
        Err(e) => {
            log::warn!("获取主题色设置失败: {}", e);
            Ok("{\"h\":210,\"s\":100,\"l\":40}".to_string())
        }
    }
}

/// 设置主题色
#[tauri::command]
pub async fn set_theme_color(h: u16, s: u16, l: u16) -> Result<(), String> {
    let value = format!("{{\"h\":{},\"s\":{},\"l\":{}}}", h, s, l);
    if let Err(e) = config_dao::set_config("theme_color", &value).await {
        log::error!("保存主题色设置到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }
    log::info!("主题色已更新为: {}", value);
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

// ===== 检查更新 =====

#[derive(Debug, Serialize)]
pub struct UpdateCheckResult {
    pub has_update: bool,
    pub latest_version: String,
    pub release_notes: String,
    pub download_url: String,
    pub error: Option<String>,
}

/// 获取当前应用版本号（从 Cargo.toml 编译时读取）
#[tauri::command]
pub fn get_app_version() -> String {
    format!("v{}", env!("CARGO_PKG_VERSION"))
}

/// 获取开源仓库地址
#[tauri::command]
pub fn get_repo_url() -> String {
    crate::config::config::REPO_URL.to_string()
}

/// 检查 GitHub 上是否有新版本
#[tauri::command]
pub async fn check_update() -> UpdateCheckResult {
    let current = env!("CARGO_PKG_VERSION");
    let releases_url = format!("{}/releases", crate::config::config::REPO_URL);
    let client = match reqwest::Client::builder()
        .user_agent("lan-share")
        .timeout(std::time::Duration::from_secs(15))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            log::error!("创建 HTTP 客户端失败: {}", e);
            return UpdateCheckResult {
                has_update: false,
                latest_version: String::new(),
                release_notes: String::new(),
                download_url: releases_url.clone(),
                error: Some(format!("创建 HTTP 客户端失败: {}", e)),
            };
        }
    };

    let resp = match client
        .get(crate::config::config::REPO_API.to_string() + "/releases/latest")
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            let detail = if let Some(source) = e.source() {
                format!("{} (原因: {})", e, source)
            } else {
                format!("{}", e)
            };
            log::error!("检查更新网络请求失败: {}", detail);
            return UpdateCheckResult {
                has_update: false,
                latest_version: String::new(),
                release_notes: String::new(),
                download_url: releases_url.clone(),
                error: Some(format!("网络请求失败: {}", detail)),
            };
        }
    };

    if !resp.status().is_success() {
        return UpdateCheckResult {
            has_update: false,
            latest_version: String::new(),
            release_notes: String::new(),
            download_url: releases_url.clone(),
            error: Some(format!("GitHub API 返回异常状态码: {}", resp.status())),
        };
    }

    let body: Result<serde_json::Value, _> = resp.json().await;
    let body = match body {
        Ok(b) => b,
        Err(e) => {
            return UpdateCheckResult {
                has_update: false,
                latest_version: String::new(),
                release_notes: String::new(),
                download_url: releases_url.clone(),
                error: Some(format!("解析响应数据失败: {}", e)),
            };
        }
    };

    let tag_name = body["tag_name"].as_str().unwrap_or("");
    let latest_version = tag_name.trim_start_matches('v');
    let release_notes = body["body"].as_str().unwrap_or("");
    let html_url = body["html_url"].as_str().unwrap_or(&releases_url);

    let has_update = compare_versions(latest_version, current);

    UpdateCheckResult {
        has_update,
        latest_version: format!("v{}", latest_version),
        release_notes: release_notes.to_string(),
        download_url: html_url.to_string(),
        error: None,
    }
}

/// 获取排除系统元数据文件开关状态（默认开启）
#[tauri::command]
pub async fn get_exclude_system_files() -> Result<bool, String> {
    match config_dao::get_config_value("exclude_system_files").await {
        Ok(Some(value)) => Ok(value.parse::<bool>().unwrap_or(true)),
        Ok(None) => Ok(true),
        Err(e) => {
            log::warn!("获取排除系统文件设置失败: {}", e);
            Ok(true)
        }
    }
}

/// 设置排除系统元数据文件开关
#[tauri::command]
pub async fn set_exclude_system_files(enabled: bool) -> Result<(), String> {
    let value = if enabled { "true" } else { "false" };
    config_dao::set_config("exclude_system_files", value)
        .await
        .map_err(|e| {
            log::error!("保存排除系统文件设置失败: {}", e);
            format!("保存配置失败: {}", e)
        })?;
    crate::config::config::reload_exclude_filter().await;
    log::info!("排除系统文件设置已更新为: {}", enabled);
    Ok(())
}

/// 获取自定义排除规则列表（JSON 字符串数组）
#[tauri::command]
pub async fn get_exclude_patterns() -> Result<Vec<String>, String> {
    match config_dao::get_config_value("exclude_patterns").await {
        Ok(Some(value)) => Ok(serde_json::from_str(&value).unwrap_or_default()),
        Ok(None) => Ok(Vec::new()),
        Err(e) => {
            log::warn!("获取排除规则列表失败: {}", e);
            Ok(Vec::new())
        }
    }
}

/// 设置自定义排除规则列表
#[tauri::command]
pub async fn set_exclude_patterns(patterns: Vec<String>) -> Result<(), String> {
    let json = serde_json::to_string(&patterns).unwrap_or_else(|_| "[]".to_string());
    config_dao::set_config("exclude_patterns", &json)
        .await
        .map_err(|e| {
            log::error!("保存排除规则列表失败: {}", e);
            format!("保存配置失败: {}", e)
        })?;
    crate::config::config::reload_exclude_filter().await;
    log::info!("排除规则列表已更新");
    Ok(())
}

// ===== 批量获取所有设置 =====

async fn get_bool_config(key: &str, default: bool) -> bool {
    match config_dao::get_config_value(key).await {
        Ok(Some(value)) => value.parse::<bool>().unwrap_or(default),
        Ok(None) => default,
        Err(e) => {
            log::warn!("获取{}失败: {}", key, e);
            default
        }
    }
}

async fn get_string_config(key: &str, default: &str) -> String {
    match config_dao::get_config_value(key).await {
        Ok(Some(value)) => value,
        Ok(None) => default.to_string(),
        Err(e) => {
            log::warn!("获取{}失败: {}", key, e);
            default.to_string()
        }
    }
}

async fn get_u16_config(key: &str, default: u16) -> u16 {
    match config_dao::get_config_value(key).await {
        Ok(Some(value)) => value.parse::<u16>().unwrap_or(default),
        Ok(None) => default,
        Err(e) => {
            log::warn!("获取{}失败: {}", key, e);
            default
        }
    }
}

async fn get_json_array_config(key: &str) -> Vec<String> {
    match config_dao::get_config_value(key).await {
        Ok(Some(value)) => serde_json::from_str(&value).unwrap_or_default(),
        Ok(None) => Vec::new(),
        Err(e) => {
            log::warn!("获取{}失败: {}", key, e);
            Vec::new()
        }
    }
}

async fn get_sharing_directory_inner() -> String {
    match config_dao::get_config_value("file_sharing_root_dir").await {
        Ok(Some(path)) => path,
        Ok(None) => {
            let sharing_root = crate::config::config::get_sharing_root().await;
            crate::utils::path::normalize_path(&(*sharing_root))
        }
        Err(e) => {
            log::warn!("获取共享根目录配置失败: {}", e);
            let sharing_root = crate::config::config::get_sharing_root().await;
            crate::utils::path::normalize_path(&(*sharing_root))
        }
    }
}

/// 一次性获取所有设置（减少 IPC 调用次数）
#[tauri::command]
pub async fn get_all_settings(app: tauri::AppHandle) -> AllSettings {
    use tauri_plugin_autostart::ManagerExt;

    let sharing_directory = get_sharing_directory_inner().await;
    let upload_enabled = get_bool_config("upload_enabled", false).await;
    let rename_enabled = get_bool_config("rename_enabled", false).await;
    let delete_enabled = get_bool_config("delete_enabled", false).await;
    let upload_overwrite_enabled = get_bool_config("upload_overwrite_enabled", false).await;
    let record_copy_enabled = get_bool_config("record_copy_enabled", false).await;
    let record_download_enabled = get_bool_config("record_download_enabled", false).await;
    let autostart = app.autolaunch().is_enabled().unwrap_or(false);
    let autostart_minimized = get_bool_config("autostart_minimized", false).await;
    let http_port = get_u16_config("http_port", 3000).await;
    let theme_setting = get_string_config("theme_setting", "system").await;
    let theme_color = get_string_config("theme_color", "{\"h\":210,\"s\":100,\"l\":40}").await;
    let language = get_string_config("language", "").await;
    let exclude_system_files = get_bool_config("exclude_system_files", true).await;
    let exclude_patterns = get_json_array_config("exclude_patterns").await;

    AllSettings {
        sharing_directory,
        upload_enabled,
        rename_enabled,
        delete_enabled,
        upload_overwrite_enabled,
        record_copy_enabled,
        record_download_enabled,
        autostart,
        autostart_minimized,
        http_port,
        theme_setting,
        theme_color,
        language,
        exclude_system_files,
        exclude_patterns,
    }
}

/// 比较两个版本号。latest > current 返回 true
fn compare_versions(latest: &str, current: &str) -> bool {
    let parse = |v: &str| -> Vec<u32> {
        v.trim_start_matches('v')
            .split('.')
            .filter_map(|s| s.parse::<u32>().ok())
            .collect()
    };
    let latest_parts = parse(latest);
    let current_parts = parse(current);
    for (l, c) in latest_parts.iter().zip(current_parts.iter()) {
        if l > c {
            return true;
        } else if l < c {
            return false;
        }
    }
    latest_parts.len() > current_parts.len()
}
