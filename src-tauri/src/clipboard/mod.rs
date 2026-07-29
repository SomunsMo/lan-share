#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(windows)]
mod windows;

use std::path::Path;

/// 从系统剪贴板读取图片
///
/// 执行顺序（arboard 优先 → 不消耗不兼容 MIME offer；子进程兜底最后）：
/// 1. platform_read_image_data     — arboard 直接读图片数据
/// 2. platform_read_file_uris      — arboard 读文件 URI
/// 3. read_image_via_subprocess    — [Linux] wl-paste/xclip 读图片数据
/// 4. read_uris_via_subprocess     — [Linux] wl-paste/xclip 读文件 URI
pub(crate) fn read_image_from_clipboard() -> Result<(u32, u32, Vec<u8>), String> {
    log::info!("[clipboard] read_image_from_clipboard 开始");

    // Step 1: arboard 直接读取图片数据（不消耗 text/uri-list offer）
    log::info!("[clipboard] Step 1: arboard 读图片");
    match platform_read_image_data() {
        Ok(img) => {
            log::info!("[clipboard] Step 1 成功 {}x{}", img.0, img.1);
            return Ok(img);
        }
        Err(e) => log::info!("[clipboard] Step 1 失败: {}", e),
    }

    // Step 2: arboard 读取文件 URI（不消耗 image/ offer）
    log::info!("[clipboard] Step 2: arboard 读 URI");
    match platform_read_file_uris() {
        Ok(uris) => {
            log::info!("[clipboard] Step 2 得到 URI: {:?}", uris);
            if let Some(img) = resolve_and_load_uris(&uris) {
                return Ok(img);
            }
        }
        Err(e) => log::info!("[clipboard] Step 2 失败: {}", e),
    }

    // Step 3: [Linux] 子进程读取图片（可能消耗 offer，须在 arboard 之后）
    #[cfg(target_os = "linux")]
    {
        log::info!("[clipboard] Step 3: 子进程读图片");
        match linux::read_image_via_subprocess() {
            Ok(img) => {
                log::info!("[clipboard] Step 3 成功 {}x{}", img.0, img.1);
                return Ok(img);
            }
            Err(e) => log::info!("[clipboard] Step 3 失败: {}", e),
        }
    }

    // Step 4: [Linux] 子进程读取文件 URI
    #[cfg(target_os = "linux")]
    {
        log::info!("[clipboard] Step 4: 子进程读 URI");
        match linux::read_uris_via_subprocess() {
            Ok(uris) => {
                log::info!("[clipboard] Step 4 得到 URI: {:?}", uris);
                if let Some(img) = resolve_and_load_uris(&uris) {
                    return Ok(img);
                }
            }
            Err(e) => log::info!("[clipboard] Step 4 失败: {}", e),
        }
    }

    Err("剪贴板中未找到可粘贴的图片".to_string())
}

/// 从 URI 列表中解析路径并加载图片
fn resolve_and_load_uris(uris: &[String]) -> Option<(u32, u32, Vec<u8>)> {
    for uri in uris {
        // Direct resolution（file:// URI / 绝对路径 / CWD 下文件）
        if let Some(path) = resolve_uri_to_path(uri) {
            if !is_image_file(&path) {
                log::debug!("跳过非图片文件: {:?}", path);
                continue;
            }
            match load_image_file(&path) {
                Ok(img) => {
                    log::info!("从 URI 加载图片成功: {:?}", path);
                    return Some(img);
                }
                Err(e) => log::debug!("加载图片文件失败 {:?}: {}", path, e),
            }
        }

        // Fallback: text/plain 中可能是纯文件名，在常见目录中搜索
        let name = std::path::Path::new(uri.trim()).file_name()?.to_str()?.to_string();
        for dir_str in &["Pictures", "Downloads", "Desktop"] {
            if let Some(home) = dirs::home_dir() {
                let path = home.join(dir_str).join(&name);
                if path.exists() && is_image_file(&path) {
                    match load_image_file(&path) {
                        Ok(img) => {
                            log::info!("在 ~/{} 找到文件: {:?}", dir_str, path);
                            return Some(img);
                        }
                        Err(e) => log::debug!("加载图片失败 {:?}: {}", path, e),
                    }
                }
            }
        }
    }
    None
}

// ==================== 平台派发 ====================

#[cfg(windows)]
fn platform_read_image_data() -> Result<(u32, u32, Vec<u8>), String> {
    windows::read_image_data()
}
#[cfg(target_os = "macos")]
fn platform_read_image_data() -> Result<(u32, u32, Vec<u8>), String> {
    macos::read_image_data()
}
#[cfg(target_os = "linux")]
fn platform_read_image_data() -> Result<(u32, u32, Vec<u8>), String> {
    linux::read_image_data()
}

#[cfg(windows)]
fn platform_read_file_uris() -> Result<Vec<String>, String> {
    windows::read_file_uris()
}
#[cfg(target_os = "macos")]
fn platform_read_file_uris() -> Result<Vec<String>, String> {
    macos::read_file_uris()
}
#[cfg(target_os = "linux")]
fn platform_read_file_uris() -> Result<Vec<String>, String> {
    linux::read_file_uris()
}

// ==================== 通用工具 ====================

fn is_image_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| {
            matches!(
                e.to_ascii_lowercase().as_str(),
                "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp" | "tiff" | "tif" | "ico"
            )
        })
        .unwrap_or(false)
}

fn resolve_uri_to_path(uri: &str) -> Option<std::path::PathBuf> {
    let uri = uri.trim();
    if let Some(encoded) = uri.strip_prefix("file://") {
        let path_str = if let Some(idx) = encoded.find('/') {
            if idx == 0 {
                encoded
            } else {
                &encoded[idx..]
            }
        } else {
            encoded
        };
        let decoded = percent_decode(path_str);
        return Some(Path::new(&decoded).to_path_buf());
    }
    let path = Path::new(uri);
    if path.exists() {
        return Some(path.to_path_buf());
    }
    None
}

fn percent_decode(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars();
    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if hex.len() == 2 {
                if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                    result.push(byte as char);
                    continue;
                }
            }
            result.push('%');
            result.push_str(&hex);
        } else {
            result.push(c);
        }
    }
    result
}

fn load_image_file(path: &Path) -> Result<(u32, u32, Vec<u8>), String> {
    let img = image::open(path).map_err(|e| format!("打开图片失败: {}", e))?;
    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();
    Ok((w, h, rgba.into_raw()))
}
