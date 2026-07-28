#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(windows)]
mod windows;

use std::path::Path;

/// 模板方法：从系统剪贴板读取图片
///
/// 执行流程（各平台共享）：
/// 1. platform_read_image_data — 直接读剪贴板中的图片数据（浏览器"复制图片"场景）
/// 2. platform_read_file_uris   — 读剪贴板中的文件 URI（资源管理器"复制"场景）
/// 3. 解析 URI → 检测扩展名 → 读取图片文件 → 返回 RGBA
pub(crate) fn read_image_from_clipboard() -> Result<(u32, u32, Vec<u8>), String> {
    // Step 1: 直接读取图片数据（Copy Image from browser / screenshot tools）
    match platform_read_image_data() {
        Ok(img) => {
            log::info!("从剪贴板直接读取图片成功 {}x{}", img.0, img.1);
            return Ok(img);
        }
        Err(e) => log::debug!("platform_read_image_data: {}", e),
    }

    // Step 2: 读取文件 URI 列表，逐一尝试加载（Copy from file manager）
    match platform_read_file_uris() {
        Ok(uris) => {
            for uri in &uris {
                let Some(path) = resolve_uri_to_path(uri) else { continue };
                if !is_image_file(&path) {
                    log::debug!("跳过非图片文件: {:?}", path);
                    continue;
                }
                match load_image_file(&path) {
                    Ok(img) => {
                        log::info!("从剪贴板 URI 加载图片成功: {:?}", path);
                        return Ok(img);
                    }
                    Err(e) => log::debug!("加载图片文件失败 {:?}: {}", path, e),
                }
            }
        }
        Err(e) => log::debug!("platform_read_file_uris: {}", e),
    }

    Err("剪贴板中未找到可粘贴的图片".to_string())
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
