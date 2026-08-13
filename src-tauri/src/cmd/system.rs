use crate::db::dao::config_dao;
use crate::db::dao::upload_dao;
use crate::http_server::sse::{fire, fire_port_changed, fire_reload, fire_root_changed, new_clear, new_image, new_image_deleted, new_text, new_text_deleted};
use serde::Serialize;
use std::error::Error;
use tauri::Emitter;

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
    pub rename_file_enabled: bool,
    pub rename_folder_enabled: bool,
    pub delete_file_enabled: bool,
    pub delete_folder_enabled: bool,
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
    pub delete_to_trash: bool,
    pub image_sharing_dir: String,
    pub tray_icon_mode: String,
}

#[derive(Serialize)]
pub struct ClearResult {
    pub text_count: u64,
    pub image_count: u64,
}

/// 获取本机内网IP，网卡未就绪（如开机自启早期）时带重试，最多约 10 秒。
/// 失败兜底返回 127.0.0.1，避免 panic 导致整个进程退出。
pub fn get_local_ip_with_retry() -> String {
    for _ in 0..10 {
        if let Ok(ip) = local_ip_address::local_ip() {
            return ip.to_string();
        }
        std::thread::sleep(std::time::Duration::from_secs(1));
    }
    String::from("127.0.0.1")
}

/// 获取本机内网IP
#[tauri::command]
pub fn get_local_ip() -> String {
    get_local_ip_with_retry()
}

/// 获取设备名称
#[tauri::command]
pub fn get_device_name() -> String {
    // Windows
    if let Ok(name) = std::env::var("COMPUTERNAME") {
        return name;
    }
    // macOS/Linux shell 环境变量（不一定存在）
    if let Ok(name) = std::env::var("HOSTNAME") {
        return name;
    }
    // POSIX gethostname fallback（macOS/Linux）
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        if let Some(name) = get_hostname() {
            return name;
        }
    }
    "Unknown Device".to_string()
}

/// 使用 POSIX gethostname() 获取主机名
#[cfg(any(target_os = "macos", target_os = "linux"))]
fn get_hostname() -> Option<String> {
    extern "C" {
        fn gethostname(name: *mut std::os::raw::c_char, len: usize) -> i32;
    }
    let mut buf = [0i8; 256];
    let result = unsafe { gethostname(buf.as_mut_ptr(), buf.len()) };
    if result == 0 {
        let c_str = unsafe { std::ffi::CStr::from_ptr(buf.as_ptr()) };
        c_str.to_str().ok().map(|s| s.split('.').next().unwrap_or(s).to_string())
    } else {
        None
    }
}

/// 清空共享文本和图片记录
#[tauri::command]
pub async fn clear_sharing_text() -> ClearResult {
    // 先删除图片文件
    match upload_dao::list_contents_by_type(5).await {
        Ok(records) => {
            for (_, content_json_str) in &records {
                if let Ok(content_json) = serde_json::from_str::<serde_json::Value>(content_json_str) {
                    if let Some(name) = content_json.get("path").and_then(|v| v.as_str()) {
                        let dir = crate::config::config::get_image_sharing_dir().await;
                        let file_path = dir.join(name);
                        if file_path.exists() {
                            if let Err(e) = std::fs::remove_file(&file_path) {
                                log::error!("删除图片文件失败: {}", e);
                            }
                        }
                    }
                }
            }
        }
        Err(e) => {
            log::error!("查询图片记录失败: {}", e);
        }
    }

    let text_count = upload_dao::remove_by_types(&[1, 3]).await.unwrap_or(0);
    let image_count = upload_dao::remove_by_types(&[5]).await.unwrap_or(0);

    log::info!("清空共享文本记录{}条，图片记录{}条", text_count, image_count);

    fire(new_clear());

    ClearResult { text_count, image_count }
}

/// 获取文本和图片共享历史记录
#[tauri::command]
pub async fn get_text_sharing_history() -> Result<Vec<crate::db::entity::TransferRecord>, String> {
    match upload_dao::list_by_types(&[1, 5]).await {
        Ok(records) => Ok(records),
        Err(err) => {
            log::error!("获取文本共享历史记录失败: {}", err);
            Err(err.to_string())
        }
    }
}

/// 删除指定记录（图片记录时连带删除文件）
#[tauri::command]
pub async fn delete_record(id: i64, action_type: i64) -> Result<u64, String> {
    if action_type == 5 {
        match upload_dao::get_by_id(id).await {
            Ok(Some(record)) => {
                if let Ok(content_json) = serde_json::from_str::<serde_json::Value>(&record.content) {
                    if let Some(name) = content_json.get("path").and_then(|v| v.as_str()) {
                        let dir = crate::config::config::get_image_sharing_dir().await;
                        let file_path = dir.join(name);
                        if file_path.exists() {
                            if let Err(e) = std::fs::remove_file(&file_path) {
                                log::error!("删除图片文件失败: {}", e);
                            }
                        }
                    }
                }
            }
            Ok(None) => {
                return Err("记录不存在".to_string());
            }
            Err(e) => {
                log::error!("查询记录失败: {}", e);
                return Err(e.to_string());
            }
        }
    }

    if action_type == 1 {
        match upload_dao::remove_text_cascade(id).await {
            Ok(count) => {
                fire(new_text_deleted());
                Ok(count)
            }
            Err(err) => {
                log::error!("删除文本及关联复制记录失败: {}", err);
                Err(err.to_string())
            }
        }
    } else if action_type == 5 {
        match upload_dao::remove(id).await {
            Ok(count) => {
                fire(new_image_deleted());
                Ok(count)
            }
            Err(err) => {
                log::error!("删除图片记录失败: {}", err);
                Err(err.to_string())
            }
        }
    } else {
        // 文件(2)/下载(4)等记录：不发事件（Web 无对应展示，不应误触发文件列表）
        match upload_dao::remove(id).await {
            Ok(count) => Ok(count),
            Err(err) => {
                log::error!("删除记录失败: {}", err);
                Err(err.to_string())
            }
        }
    }
}

/// 预览剪贴板图片（只读不存，返回 base64 供前端弹确认框）
#[tauri::command]
pub async fn peek_clipboard_image() -> Result<serde_json::Value, String> {
    // 剪贴板读取与图片编码均为同步阻塞操作，放到阻塞线程池避免卡住 async runtime
    let result = tokio::task::spawn_blocking(|| -> Result<serde_json::Value, String> {
        let (width, height, rgba_bytes) = crate::clipboard::read_image_from_clipboard()?;
        // RGBA → PNG bytes → base64
        let img = image::RgbaImage::from_raw(width, height, rgba_bytes)
            .ok_or("创建图片缓冲失败")?;
        let mut png_bytes = Vec::new();
        img.write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageFormat::Png)
            .map_err(|e| format!("PNG编码失败: {}", e))?;
        let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png_bytes);
        Ok(serde_json::json!({
            "width": width,
            "height": height,
            "data_base64": format!("data:image/png;base64,{}", b64),
        }))
    })
    .await
    .map_err(|e| format!("剪贴板读取任务失败: {}", e))??;
    Ok(result)
}

/// 同步读取并准备图片数据：file_path > image_bytes > 系统剪贴板
/// 返回 (sha256, file_bytes, size, ext)
/// - file_path / image_bytes：hash 原始字节，保存原格式（优化 A）
/// - clipboard（RGBA）：先编码 PNG，再 hash PNG 字节（优化 B）
fn prepare_image_payload(
    image_bytes: Option<Vec<u8>>,
    file_path: Option<String>,
) -> Result<(String, Vec<u8>, i64, String), String> {
    use sha2::{Sha256, Digest};

    if let Some(path) = file_path {
        // 从文件路径读取（优化 A：直接 hash 原文件字节，不做图片解码）
        let bytes = std::fs::read(&path).map_err(|e| format!("读取图片文件失败: {}", e))?;
        let format = image::guess_format(&bytes).map_err(|e| format!("无法识别的图片格式: {}", e))?;
        let ext = format.extensions_str().first().copied().unwrap_or("png").to_string();
        let mut hasher = Sha256::new();
        hasher.update(&bytes);
        let sha256_hash = format!("{:x}", hasher.finalize());
        let size = bytes.len() as i64;
        Ok((sha256_hash, bytes, size, ext))
    } else if let Some(bytes) = image_bytes {
        // 从文件字节保存（优化 A：前端 getAsFile 传来的原始字节，直接 hash 保存）
        let format = image::guess_format(&bytes).map_err(|e| format!("无法识别的图片格式: {}", e))?;
        let ext = format.extensions_str().first().copied().unwrap_or("png").to_string();
        let mut hasher = Sha256::new();
        hasher.update(&bytes);
        let sha256_hash = format!("{:x}", hasher.finalize());
        let size = bytes.len() as i64;
        Ok((sha256_hash, bytes, size, ext))
    } else {
        // 从系统剪贴板读取（优化 B：先编码 PNG，再 hash PNG 字节而非原始 RGBA）
        let (width, height, rgba_bytes) = crate::clipboard::read_image_from_clipboard()?;
        let img = image::RgbaImage::from_raw(width, height, rgba_bytes)
            .ok_or("创建图片缓冲失败".to_string())?;
        let mut png_bytes = Vec::new();
        img.write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageFormat::Png)
            .map_err(|e| format!("PNG编码失败: {}", e))?;
        let mut hasher = Sha256::new();
        hasher.update(&png_bytes);
        let sha256_hash = format!("{:x}", hasher.finalize());
        let size = png_bytes.len() as i64;
        Ok((sha256_hash, png_bytes, size, "png".to_string()))
    }
}

/// 读取剪贴板/文件图片并保存
/// 优先级：file_path > image_bytes > 系统剪贴板模板方法
/// - file_path: 前端从 paste event 中提取的文件路径（避免操作剪贴板）
/// - image_bytes: 前端从 paste event getAsFile 读取的字节
/// - None: 使用 clipboard 模块的模板方法（跨平台：arboard / NSPasteboard / wl-paste）
#[tauri::command]
pub async fn read_clipboard_image(
    image_bytes: Option<Vec<u8>>,
    file_path: Option<String>,
) -> Result<serde_json::Value, String> {
    // 读取/解码/编码/哈希均为同步阻塞（含剪贴板访问与文件 IO），放到阻塞线程池避免卡住 async runtime
    let (sha256_hash, file_bytes, size, ext) =
        tokio::task::spawn_blocking(move || prepare_image_payload(image_bytes, file_path))
            .await
            .map_err(|e| format!("图片处理任务失败: {}", e))??;

    let local_ip = get_local_ip_with_retry();

    // 检查是否已存在相同 sha256 + size 的图片
    if let Ok(Some(existing)) = upload_dao::find_image_by_sha256_size(&sha256_hash, size).await {
        log::info!("发现重复图片 ID={}，刷新时间", existing.id);
        upload_dao::record_share_event(existing.id, &local_ip).await
            .map_err(|e| format!("刷新记录失败: {}", e))?;

        let content_json: serde_json::Value = serde_json::from_str(&existing.content)
            .unwrap_or_else(|_| serde_json::json!({}));
        fire(new_image(None));
        return Ok(content_json);
    }

    let save_dir = crate::config::config::get_image_sharing_dir().await.clone();
    tokio::fs::create_dir_all(&save_dir).await.map_err(|e| format!("创建目录失败: {}", e))?;

    let file_name = format!("lans_{}.{}", sha256_hash, ext);
    let save_path = save_dir.join(&file_name);

    // 检查文件是否已存在（可能之前手动清理过DB记录但文件还在）
    if !save_path.exists() {
        tokio::fs::write(&save_path, &file_bytes).await
            .map_err(|e| format!("写入图片文件失败: {}", e))?;
        log::info!("图片已保存至: {:?}", save_path);
    } else {
        log::info!("图片文件已存在: {:?}", save_path);
    }

    // 插入 DB 记录（含首次共享历史）
    let id = upload_dao::add_with_share(5, "{}", None, &local_ip, false).await
        .map_err(|e| format!("插入记录失败: {}", e))?;

    let content_json = serde_json::json!({
        "path": file_name,
        "original_name": file_name,
        "sha256": sha256_hash,
        "size": size
    });

    upload_dao::update_content(id, &content_json.to_string()).await
        .map_err(|e| format!("更新记录内容失败: {}", e))?;

    log::info!("图片记录已创建, ID={}", id);

    fire(new_image(None));

    Ok(content_json)
}

/// 复制文本到剪贴板
#[tauri::command]
pub async fn copy_text_to_clipboard(text: String) -> Result<(), String> {
    let mut clipboard = arboard::Clipboard::new().map_err(|e| format!("无法访问剪贴板: {}", e))?;
    clipboard.set_text(&text).map_err(|e| format!("设置剪贴板文本失败: {}", e))?;
    log::info!("文本已复制到剪贴板");
    Ok(())
}

/// 复制图片文件到剪贴板
#[tauri::command]
pub async fn copy_image_to_clipboard(image_path: String) -> Result<(), String> {
    let full_path = {
        let dir = crate::config::config::get_image_sharing_dir().await;
        let p = std::path::Path::new(&image_path);
        if p.is_absolute() { p.to_path_buf() } else { dir.join(&image_path) }
    };

    let img = image::open(&full_path).map_err(|e| format!("打开图片失败: {}", e))?;
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();
    let bytes = rgba.into_raw();

    #[cfg(target_os = "windows")]
    {
        copy_image_to_clipboard_windows(&bytes, width, height)?;
        log::info!("图片已通过 Win32 API 复制到剪贴板: {:?}", full_path);
        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    {
        let mut clipboard = arboard::Clipboard::new().map_err(|e| format!("无法访问剪贴板: {}", e))?;
        clipboard.set_image(arboard::ImageData {
            width: width as usize,
            height: height as usize,
            bytes: std::borrow::Cow::Owned(bytes),
        }).map_err(|e| format!("设置剪贴板图片失败: {}", e))?;
        log::info!("图片已复制到剪贴板: {:?}", full_path);
        Ok(())
    }
}

/// Windows 平台：使用 Win32 API 同时写入图片 (CF_DIBV5) 和文本 (CF_UNICODETEXT)
/// 确保大图片也能被 Windows 剪贴板历史收录
#[cfg(target_os = "windows")]
fn copy_image_to_clipboard_windows(rgba_bytes: &[u8], width: u32, height: u32) -> Result<(), String> {
    use std::ptr;

    extern "system" {
        fn OpenClipboard(hwnd: *mut std::ffi::c_void) -> i32;
        fn CloseClipboard() -> i32;
        fn EmptyClipboard() -> i32;
        fn SetClipboardData(uFormat: u32, hMem: isize) -> isize;
        fn GlobalAlloc(uFlags: u32, dwBytes: usize) -> isize;
        fn GlobalLock(hMem: isize) -> *mut std::ffi::c_void;
        fn GlobalUnlock(hMem: isize) -> i32;
        fn GlobalFree(hMem: isize) -> isize;
    }

    const CF_DIBV5: u32 = 17;
    const CF_UNICODETEXT: u32 = 13;
    const GHND: u32 = 0x0042; // GMEM_MOVEABLE | GMEM_ZEROINIT

    // 转换 RGBA → BGRA + alpha 预乘
    let pixel_count = (width * height) as usize;
    let mut bgra = Vec::with_capacity(pixel_count * 4);
    for pixel in rgba_bytes.chunks(4) {
        let r = pixel[0] as u32;
        let g = pixel[1] as u32;
        let b = pixel[2] as u32;
        let a = pixel[3] as u32;
        let bgra_b = (b * a / 255) as u8;
        let bgra_g = (g * a / 255) as u8;
        let bgra_r = (r * a / 255) as u8;
        bgra.extend_from_slice(&[bgra_b, bgra_g, bgra_r, a as u8]);
    }

    let dib_size = pixel_count * 4;

    // BITMAPV5HEADER (124 bytes)
    let bmp_header: Vec<u8> = {
        let b5_size: u32 = 124;
        // 使用负高度表示 top-down DIB
        let b5_height: i32 = -(height as i32);
        let comp_bi_bitfields: u32 = 3;
        let cs_type: u32 = 0x57696E20; // "Win " LCS_WINDOWS_COLOR_SPACE
        let intent_lcs_gm_images: u32 = 4;

        let mut hdr = Vec::with_capacity(124);
        hdr.extend_from_slice(&b5_size.to_le_bytes());          // bV5Size
        hdr.extend_from_slice(&(width as i32).to_le_bytes());   // bV5Width
        hdr.extend_from_slice(&b5_height.to_le_bytes());        // bV5Height
        hdr.extend_from_slice(&1u16.to_le_bytes());             // bV5Planes
        hdr.extend_from_slice(&32u16.to_le_bytes());            // bV5BitCount
        hdr.extend_from_slice(&comp_bi_bitfields.to_le_bytes());// bV5Compression
        hdr.extend_from_slice(&(dib_size as u32).to_le_bytes());// bV5SizeImage
        hdr.extend_from_slice(&0i32.to_le_bytes());             // bV5XPelsPerMeter
        hdr.extend_from_slice(&0i32.to_le_bytes());             // bV5YPelsPerMeter
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5ClrUsed
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5ClrImportant
        hdr.extend_from_slice(&0x00FF0000u32.to_le_bytes());    // bV5RedMask
        hdr.extend_from_slice(&0x0000FF00u32.to_le_bytes());    // bV5GreenMask
        hdr.extend_from_slice(&0x000000FFu32.to_le_bytes());    // bV5BlueMask
        hdr.extend_from_slice(&0xFF000000u32.to_le_bytes());    // bV5AlphaMask
        hdr.extend_from_slice(&cs_type.to_le_bytes());          // bV5CSType
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5Endpoints[0]
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5Endpoints[1]
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5Endpoints[2]
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5Endpoints[3]
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5Endpoints[4]
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5Endpoints[5]
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5Endpoints[6]
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5Endpoints[7]
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5Endpoints[8]
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5GammaRed
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5GammaGreen
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5GammaBlue
        hdr.extend_from_slice(&intent_lcs_gm_images.to_le_bytes()); // bV5Intent
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5ProfileData
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5ProfileSize
        hdr.extend_from_slice(&0u32.to_le_bytes());             // bV5Reserved
        debug_assert!(hdr.len() == 124, "BITMAPV5HEADER 大小必须为 124 字节");
        hdr
    };

    // 组装完整 DIB 数据: header + pixels
    let mut dib_data = bmp_header;
    dib_data.extend_from_slice(&bgra);

    // 分配全局内存并复制 DIB 数据
    let h_dib = unsafe { GlobalAlloc(GHND, dib_data.len()) };
    if h_dib == 0 {
        return Err("分配全局内存失败 (DIB)".to_string());
    }
    unsafe {
        let p_dib = GlobalLock(h_dib) as *mut u8;
        if p_dib.is_null() {
            GlobalFree(h_dib);
            return Err("锁定全局内存失败 (DIB)".to_string());
        }
        ptr::copy_nonoverlapping(dib_data.as_ptr(), p_dib, dib_data.len());
        GlobalUnlock(h_dib);
    }

    // 分配全局内存并复制文本数据（用于触发剪贴板历史收录）
    let text_wide: Vec<u16> = "LAN Share 图片\0".encode_utf16().collect();
    let text_bytes = text_wide.len() * 2;
    let h_text = unsafe { GlobalAlloc(GHND, text_bytes) };
    if h_text == 0 {
        // 失败时释放已分配的内存
        unsafe { GlobalFree(h_dib); }
        return Err("分配全局内存失败 (TEXT)".to_string());
    }
    unsafe {
        let p_text = GlobalLock(h_text) as *mut u16;
        if p_text.is_null() {
            GlobalFree(h_dib);
            GlobalFree(h_text);
            return Err("锁定全局内存失败 (TEXT)".to_string());
        }
        ptr::copy_nonoverlapping(text_wide.as_ptr(), p_text, text_wide.len());
        GlobalUnlock(h_text);
    }

    // 写入剪贴板
    let result = unsafe { OpenClipboard(ptr::null_mut()) };
    if result == 0 {
        unsafe { GlobalFree(h_dib); GlobalFree(h_text); }
        return Err("打开剪贴板失败".to_string());
    }

    unsafe { EmptyClipboard(); }

    let ret_dib = unsafe { SetClipboardData(CF_DIBV5, h_dib) };
    let ret_text = unsafe { SetClipboardData(CF_UNICODETEXT, h_text) };

    unsafe { CloseClipboard(); }

    // 如果 SetClipboardData 失败，返回错误
    // 注意: SetClipboardData 成功后，内存 ownership 转移给系统，不再需要 GlobalFree
    if ret_dib == 0 && ret_text == 0 {
        // 都失败时需要释放内存
        unsafe { GlobalFree(h_dib); GlobalFree(h_text); }
        return Err("设置剪贴板数据失败".to_string());
    }

    Ok(())
}



/// 设置图片共享目录
#[tauri::command]
pub async fn set_image_sharing_dir(directory_path: String) -> Result<(), String> {
    let path = std::path::PathBuf::from(&directory_path);

    if !path.exists() {
        return Err("路径不存在".to_string());
    }

    if !path.is_dir() {
        return Err("请选择一个有效的目录".to_string());
    }

    // 验证目录可写
    let test_file_path = path.join(".writable_test");
    match tokio::fs::write(&test_file_path, b"").await {
        Ok(_) => {
            let _ = tokio::fs::remove_file(&test_file_path).await;
        }
        Err(e) => {
            return Err(format!("目录不可写: {}", e));
        }
    }

    // 保存到数据库配置
    config_dao::set_config("image_sharing_dir", &crate::utils::path::normalize_path(&path)).await
        .map_err(|e| format!("保存配置失败: {}", e))?;

    // 更新全局图片共享目录
    crate::config::config::set_image_sharing_dir_raw(path).await;

    log::info!("图片共享目录已设置为: {}", directory_path);
    Ok(())
}

/// 迁移图片共享目录（将 from 目录中的 PNG 文件复制到 to 目录）
#[tauri::command]
pub async fn migrate_image_sharing_dir(from: String, to: String) -> Result<(), String> {
    let from_path = std::path::PathBuf::from(&from);

    if !from_path.exists() {
        return Err("源路径不存在".to_string());
    }

    if !from_path.is_dir() {
        return Err("源路径不是有效的目录".to_string());
    }

    tokio::fs::create_dir_all(&to).await
        .map_err(|e| format!("创建目标目录失败: {}", e))?;

    let to_path = std::path::PathBuf::from(&to);

    // 只迁移数据库中 action_type=5 记录的图片文件
    let records = upload_dao::list_contents_by_type(5).await
        .map_err(|e| format!("查询图片记录失败: {}", e))?;

    let mut count = 0u64;
    let mut moved = Vec::new();
    for (_, content_json_str) in &records {
        if let Ok(content_json) = serde_json::from_str::<serde_json::Value>(content_json_str) {
            if let Some(name) = content_json.get("path").and_then(|v| v.as_str()) {
                let src = from_path.join(name);
                if !src.exists() { continue; }
                let dest = to_path.join(name);
                match tokio::fs::rename(&src, &dest).await {
                    Ok(_) => {
                        moved.push(name.to_string());
                        count += 1;
                    }
                    Err(e) => {
                        // 回滚已移动的文件
                        for f in &moved {
                            let _ = tokio::fs::rename(to_path.join(f), from_path.join(f)).await;
                        }
                        return Err(format!("移动文件 {} 失败，已回滚: {}", name, e));
                    }
                }
            }
        }
    }

    log::info!("已迁移 {} 个图片文件从 {:?} 到 {:?}", count, from_path, to_path);
    Ok(())
}

/// 分享文本到局域网
#[tauri::command]
pub async fn share_text_to_lan(text_data: String) -> Result<(), String> {
    // 获取本地IP地址作为客户端IP
    let local_ip = get_local_ip_with_retry();

    log::info!("来自[{}]的文本：{}", local_ip, text_data);

    // 检查是否存在内容完全一致的文本记录
    match upload_dao::find_text_by_content(&text_data).await {
        Ok(Some(existing)) => {
            log::info!("发现重复文本 ID={}，刷新时间，共享数+1", existing.id);
            upload_dao::record_share_event(existing.id, &local_ip).await
                .map_err(|e| format!("刷新记录失败: {}", e))?;
            fire(new_text(None));
            Ok(())
        }
        Ok(None) => {
            // 不存在相同内容，新增记录（含首次共享历史）
            match upload_dao::add_with_share(1, &text_data, None, &local_ip, false).await {
                Ok(_) => {
                    log::info!("文本分享成功");
                    fire(new_text(None));
                    Ok(())
                }
                Err(err) => {
                    log::error!("文本分享失败: {}", err);
                    Err(err.to_string())
                }
            }
        }
        Err(err) => {
            log::error!("查询文本记录失败: {}", err);
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

    // 通知 Web 重置 URL dir 并重拉根目录
    fire_root_changed();

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
    fire_reload();
    Ok(())
}

/// 获取重命名文件状态
#[tauri::command]
pub async fn get_rename_file_enabled() -> Result<bool, String> {
    match config_dao::get_config_value("rename_file_enabled").await {
        Ok(Some(value)) => Ok(value.parse::<bool>().unwrap_or(false)),
        Ok(None) => Ok(false),
        Err(e) => {
            log::warn!("获取重命名文件设置失败: {}", e);
            Ok(false)
        }
    }
}

/// 设置重命名文件状态
#[tauri::command]
pub async fn set_rename_file_enabled(enabled: bool) -> Result<(), String> {
    let value = if enabled { "true" } else { "false" };
    if let Err(e) = config_dao::set_config("rename_file_enabled", value).await {
        log::error!("保存重命名文件设置到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }
    log::info!("重命名文件设置已更新为: {}", enabled);
    fire_reload();
    Ok(())
}

/// 获取重命名文件夹状态
#[tauri::command]
pub async fn get_rename_folder_enabled() -> Result<bool, String> {
    match config_dao::get_config_value("rename_folder_enabled").await {
        Ok(Some(value)) => Ok(value.parse::<bool>().unwrap_or(false)),
        Ok(None) => Ok(false),
        Err(e) => {
            log::warn!("获取重命名文件夹设置失败: {}", e);
            Ok(false)
        }
    }
}

/// 设置重命名文件夹状态
#[tauri::command]
pub async fn set_rename_folder_enabled(enabled: bool) -> Result<(), String> {
    let value = if enabled { "true" } else { "false" };
    if let Err(e) = config_dao::set_config("rename_folder_enabled", value).await {
        log::error!("保存重命名文件夹设置到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }
    log::info!("重命名文件夹设置已更新为: {}", enabled);
    fire_reload();
    Ok(())
}

/// 获取删除文件状态
#[tauri::command]
pub async fn get_delete_file_enabled() -> Result<bool, String> {
    match config_dao::get_config_value("delete_file_enabled").await {
        Ok(Some(value)) => Ok(value.parse::<bool>().unwrap_or(false)),
        Ok(None) => Ok(false),
        Err(e) => {
            log::warn!("获取删除文件设置失败: {}", e);
            Ok(false)
        }
    }
}

/// 设置删除文件状态
#[tauri::command]
pub async fn set_delete_file_enabled(enabled: bool) -> Result<(), String> {
    let value = if enabled { "true" } else { "false" };
    if let Err(e) = config_dao::set_config("delete_file_enabled", value).await {
        log::error!("保存删除文件设置到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }
    log::info!("删除文件设置已更新为: {}", enabled);
    fire_reload();
    Ok(())
}

/// 获取删除文件夹状态
#[tauri::command]
pub async fn get_delete_folder_enabled() -> Result<bool, String> {
    match config_dao::get_config_value("delete_folder_enabled").await {
        Ok(Some(value)) => Ok(value.parse::<bool>().unwrap_or(false)),
        Ok(None) => Ok(false),
        Err(e) => {
            log::warn!("获取删除文件夹设置失败: {}", e);
            Ok(false)
        }
    }
}

/// 设置删除文件夹状态
#[tauri::command]
pub async fn set_delete_folder_enabled(enabled: bool) -> Result<(), String> {
    let value = if enabled { "true" } else { "false" };
    if let Err(e) = config_dao::set_config("delete_folder_enabled", value).await {
        log::error!("保存删除文件夹设置到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }
    log::info!("删除文件夹设置已更新为: {}", enabled);
    fire_reload();
    Ok(())
}

/// 获取删除到回收站设置状态
#[tauri::command]
pub async fn get_delete_to_trash() -> Result<bool, String> {
    match config_dao::get_config_value("delete_to_trash").await {
        Ok(Some(value)) => {
            let enabled = value.parse::<bool>().unwrap_or(true);
            Ok(enabled)
        }
        Ok(None) => Ok(true),
        Err(e) => {
            log::warn!("获取删除到回收站设置失败: {}", e);
            Ok(true)
        }
    }
}

/// 设置删除到回收站状态
#[tauri::command]
pub async fn set_delete_to_trash(enabled: bool) -> Result<(), String> {
    let value = if enabled { "true" } else { "false" };

    if let Err(e) = config_dao::set_config("delete_to_trash", value).await {
        log::error!("保存删除到回收站设置到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }

    log::info!("删除到回收站设置已更新为: {}", enabled);
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
    fire_reload();
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
        // auto-launch 插件把 .desktop 写到 ~/.config/autostart/{productName}.desktop，
        // 文件名取 productName（如 "LAN Share.desktop"），与硬编码的 "lan-share.desktop" 不符，
        // 导致这里永远找不到文件、--silent 永不生效。
        // 改为扫描 autostart 目录，按 Exec 行引用的可执行文件定位，避免命名漂移。
        let home = match dirs::home_dir() {
            Some(h) => h,
            None => return,
        };
        let autostart_dir = home.join(".config").join("autostart");
        let exe = match std::env::current_exe() {
            Ok(p) => p,
            Err(_) => return,
        };
        let exe_path = exe.to_string_lossy().to_string();
        let exe_name = exe.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();

        let path = match find_autostart_desktop(&autostart_dir, &exe_path, &exe_name) {
            Some(p) => p,
            None => {
                log::warn!("未在 {:?} 中找到本程序的 autostart .desktop", autostart_dir);
                return;
            }
        };

        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Some(new_content) = rewrite_desktop_exec(&content, minimized) {
                if let Err(e) = std::fs::write(&path, new_content) {
                    log::error!("更新 autostart 文件 {} 失败: {}", path.display(), e);
                } else {
                    log::info!(
                        "已更新 autostart Exec（{}）: {}",
                        if minimized { "追加 --silent" } else { "移除 --silent" },
                        path.display()
                    );
                }
            }
        }
    }
}

/// 在 autostart 目录中定位 Exec 行引用指定可执行文件的 .desktop 文件。
/// 优先匹配完整路径，其次匹配可执行文件名（如 AppImage 场景 Exec 只含 AppImage 路径）。
#[cfg(target_os = "linux")]
fn find_autostart_desktop(
    autostart_dir: &std::path::Path,
    exe_path: &str,
    exe_name: &str,
) -> Option<std::path::PathBuf> {
    for needle in [exe_path, exe_name] {
        if needle.is_empty() {
            continue;
        }
        for entry in std::fs::read_dir(autostart_dir).ok()?.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("desktop") {
                continue;
            }
            if let Ok(content) = std::fs::read_to_string(&path) {
                if content.contains(needle) {
                    return Some(path);
                }
            }
        }
    }
    None
}

/// 在 .desktop 内容的 Exec 行中追加/移除 `--silent` 参数。
/// 返回修改后的完整内容；无需修改时返回 None。
#[cfg(any(target_os = "linux", test))]
fn rewrite_desktop_exec(content: &str, minimized: bool) -> Option<String> {
    let arg = "--silent";
    let exec_prefix = "Exec=";
    let exec_pos = content.find(exec_prefix)?;
    let eol = content[exec_pos..]
        .find('\n')
        .map(|p| exec_pos + p)
        .unwrap_or(content.len());
    let exec_line = &content[exec_pos..eol];
    if minimized {
        if !exec_line.contains(arg) {
            let new_line = format!("{} {}", exec_line, arg);
            Some(format!("{}{}{}", &content[..exec_pos], new_line, &content[eol..]))
        } else {
            None
        }
    } else if exec_line.contains(arg) {
        let parts: Vec<&str> = exec_line.split_whitespace().collect();
        let cleaned = parts.into_iter().filter(|p| *p != arg).collect::<Vec<_>>().join(" ");
        Some(format!("{}{}{}", &content[..exec_pos], cleaned, &content[eol..]))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn append_silent_to_plain_exec() {
        let content = "[Desktop Entry]\nType=Application\nExec=/usr/bin/lan-share\nTerminal=false";
        let out = rewrite_desktop_exec(content, true).unwrap();
        assert!(out.contains("Exec=/usr/bin/lan-share --silent"));
        assert_eq!(out.matches("Exec=").count(), 1);
    }

    #[test]
    fn silent_already_present_no_change() {
        let content = "[Desktop Entry]\nType=Application\nExec=/usr/bin/lan-share --silent\n";
        assert!(rewrite_desktop_exec(content, true).is_none());
    }

    #[test]
    fn remove_silent_when_present() {
        let content = "[Desktop Entry]\nType=Application\nExec=/usr/bin/lan-share --silent\nTerminal=false";
        let out = rewrite_desktop_exec(content, false).unwrap();
        assert!(out.contains("Exec=/usr/bin/lan-share\n"));
        assert!(!out.contains("--silent"));
        assert_eq!(out.matches("Exec=").count(), 1);
    }

    #[test]
    fn remove_silent_when_absent_no_change() {
        let content = "[Desktop Entry]\nType=Application\nExec=/usr/bin/lan-share\n";
        assert!(rewrite_desktop_exec(content, false).is_none());
    }

    #[test]
    fn no_exec_line_returns_none() {
        let content = "[Desktop Entry]\nType=Application\nName=LAN Share\n";
        assert!(rewrite_desktop_exec(content, true).is_none());
    }
}

/// 获取HTTP服务配置端口（可能还未生效，重启后才生效）
#[tauri::command]
pub async fn get_http_port() -> Result<u16, String> {
    match config_dao::get_config_value("http_port").await {
        Ok(Some(value)) => {
            let port = value.parse::<u16>().unwrap_or(6633);
            Ok(port)
        }
        Ok(None) => Ok(6633),
        Err(e) => {
            log::warn!("获取HTTP端口设置失败: {}", e);
            Ok(6633)
        }
    }
}

/// 获取当前HTTP服务正在运行的端口
#[tauri::command]
pub fn get_running_port() -> u16 {
    crate::config::config::get_running_http_port()
}

/// 获取HTTP服务器运行状态（前端主动查询）
#[tauri::command]
pub fn get_server_status() -> ServerStatus {
    let port = crate::config::config::get_running_http_port();
    match crate::config::config::get_occupied_port() {
        Some(p) => ServerStatus {
            running: false,
            port: p,
            reason: "port_occupied".to_string(),
        },
        None => ServerStatus {
            running: true,
            port,
            reason: String::new(),
        },
    }
}

/// 设置HTTP服务端口（验证可用后立即热切换，无需重启应用）
#[tauri::command]
pub async fn set_http_port(app: tauri::AppHandle, port: u16) -> Result<(), String> {
    // u16类型范围是 0-65535，所以不用判断是否超出
    if port < 1 {
        return Err("端口号必须在 1-65535 之间".to_string());
    }

    if port == crate::config::config::get_running_http_port() {
        return Ok(());
    }

    // 先绑定新端口验证可用（成功即持有该端口，后续直接复用，杜绝"检测与占用之间被抢占"的竞态）
    let listener = crate::http_server::http_server::bind_listener(port)
        .await
        .map_err(|e| format!("端口 {} 无法使用: {}", port, e))?;

    // 验证通过后再保存配置，保存失败则丢弃 listener 回滚，不改变运行状态
    if let Err(e) = config_dao::set_config("http_port", &port.to_string()).await {
        log::error!("保存HTTP端口设置到数据库失败: {}", e);
        return Err(format!("保存配置失败: {}", e));
    }

    // 先起新服务再停旧服务，无缝切换；同时清除历史占用标记
    crate::http_server::http_server::run_on(listener, port);
    crate::config::config::set_occupied_port(None);

    log::info!("HTTP服务端口已切换为: {}", port);
    let _ = app.emit("lan-share:port-changed", port);
    fire_port_changed(port);
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

/// 获取指定记录的共享历史记录
#[tauri::command]
pub async fn get_share_records(transfer_id: i64) -> Result<Vec<crate::db::entity::ShareRecord>, String> {
    match upload_dao::list_share_records(transfer_id).await {
        Ok(records) => Ok(records),
        Err(err) => {
            log::error!("获取共享历史记录失败: {}", err);
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

/// 获取托盘图标模式
#[tauri::command]
pub async fn get_tray_icon_mode() -> Result<String, String> {
    match config_dao::get_config_value("tray_icon_mode").await {
        Ok(Some(value)) => Ok(value),
        Ok(None) => Ok("template".to_string()),
        Err(e) => {
            log::warn!("获取托盘图标模式失败: {}", e);
            Ok("template".to_string())
        }
    }
}

/// 设置托盘图标模式并立即生效
#[tauri::command]
pub async fn set_tray_icon_mode(app: tauri::AppHandle, mode: String) -> Result<(), String> {
    if mode != "color" && mode != "template" {
        return Err("无效的图标模式，仅支持 color/template".to_string());
    }

    config_dao::set_config("tray_icon_mode", &mode)
        .await
        .map_err(|e| format!("保存托盘图标模式失败: {}", e))?;

    crate::tray::update_tray_icon(&app, &mode)
}

/// 更新托盘菜单文本（前端语言切换后同步托盘菜单）
#[tauri::command]
pub fn update_tray_menu(
    show: String,
    settings: String,
    quit: String,
) -> Result<(), String> {
    crate::tray::update_tray_menu_texts(&show, &settings, &quit)
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
    let value = serde_json::json!({"h": h, "s": s, "l": l}).to_string();
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
    fire_reload();
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
    fire_reload();
    Ok(())
}

/// 一次性获取所有设置（减少 IPC 调用次数）
#[tauri::command]
pub async fn get_all_settings(app: tauri::AppHandle) -> AllSettings {
    use tauri_plugin_autostart::ManagerExt;

    let keys = &[
        "file_sharing_root_dir",
        "upload_enabled",
        "rename_file_enabled",
        "rename_folder_enabled",
        "delete_file_enabled",
        "delete_folder_enabled",
        "upload_overwrite_enabled",
        "record_copy_enabled",
        "record_download_enabled",
        "autostart_minimized",
        "http_port",
        "theme_setting",
        "theme_color",
        "language",
        "exclude_system_files",
        "exclude_patterns",
        "delete_to_trash",
        "image_sharing_dir",
        "tray_icon_mode",
    ];
    let configs = config_dao::get_config_values(keys).await;

    log::info!(
        "[get_all_settings] raw configs from DB: upload_enabled={:?}, configs len={}",
        configs.get("upload_enabled"),
        configs.len(),
    );

    let sharing_directory = match configs.get("file_sharing_root_dir") {
        Some(path) => path.clone(),
        None => {
            let sharing_root = crate::config::config::get_sharing_root().await;
            crate::utils::path::normalize_path(&(*sharing_root))
        }
    };

    let autostart = app.autolaunch().is_enabled().unwrap_or(false);

    let image_sharing_dir = match configs.get("image_sharing_dir") {
        Some(path) => path.clone(),
        None => {
            let img_dir = crate::config::config::get_image_sharing_dir().await;
            crate::utils::path::normalize_path(&(*img_dir))
        }
    };

    let result = AllSettings {
        sharing_directory,
        upload_enabled: configs.get("upload_enabled").map(|v| v == "true").unwrap_or(false),
        rename_file_enabled: configs.get("rename_file_enabled").map(|v| v == "true").unwrap_or(false),
        rename_folder_enabled: configs.get("rename_folder_enabled").map(|v| v == "true").unwrap_or(false),
        delete_file_enabled: configs.get("delete_file_enabled").map(|v| v == "true").unwrap_or(false),
        delete_folder_enabled: configs.get("delete_folder_enabled").map(|v| v == "true").unwrap_or(false),
        upload_overwrite_enabled: configs.get("upload_overwrite_enabled").map(|v| v == "true").unwrap_or(false),
        record_copy_enabled: configs.get("record_copy_enabled").map(|v| v == "true").unwrap_or(false),
        record_download_enabled: configs.get("record_download_enabled").map(|v| v == "true").unwrap_or(false),
        autostart,
        autostart_minimized: configs.get("autostart_minimized").map(|v| v == "true").unwrap_or(false),
        http_port: configs.get("http_port").and_then(|v| v.parse::<u16>().ok()).unwrap_or(6633),
        theme_setting: configs.get("theme_setting").cloned().unwrap_or_else(|| "system".to_string()),
        theme_color: configs.get("theme_color").cloned().unwrap_or_else(|| "{\"h\":210,\"s\":100,\"l\":40}".to_string()),
        language: configs.get("language").cloned().unwrap_or_default(),
        exclude_system_files: configs.get("exclude_system_files").map(|v| v == "true").unwrap_or(true),
        exclude_patterns: configs.get("exclude_patterns").and_then(|v| serde_json::from_str(v).ok()).unwrap_or_default(),
        delete_to_trash: configs.get("delete_to_trash").map(|v| v == "true").unwrap_or(true),
        image_sharing_dir,
        tray_icon_mode: configs.get("tray_icon_mode").cloned().unwrap_or_else(|| "template".to_string()),
    };

    log::debug!(
        "[get_all_settings] returning upload_enabled={}",
        result.upload_enabled,
    );
    result
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
