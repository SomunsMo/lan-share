use std::ffi::CStr;
use objc2::runtime::NSObject;

/// 从剪贴板直接读取图片数据
pub(crate) fn read_image_data() -> Result<(u32, u32, Vec<u8>), String> {
    let mut cb =
        arboard::Clipboard::new().map_err(|e| format!("无法访问剪贴板: {}", e))?;
    let img = cb
        .get_image()
        .map_err(|e| format!("读取剪贴板图片失败: {}", e))?;
    Ok((img.width as u32, img.height as u32, img.bytes.to_vec()))
}

/// 从剪贴板读取文件 URI 列表
///
/// 策略：
/// 1. arboard::get_text() — Finder 会将文件路径设为 NSStringPboardType
/// 2. NSPasteboard readObjectsForClasses: — 读取 NSURL 对象（兜底）
pub(crate) fn read_file_uris() -> Result<Vec<String>, String> {
    // Try arboard text first (macOS Finder puts file path as plain text)
    if let Ok(mut cb) = arboard::Clipboard::new() {
        if let Ok(text) = cb.get_text() {
            let trimmed = text.trim().to_string();
            if !trimmed.is_empty() {
                let path = std::path::Path::new(&trimmed);
                if path.exists() {
                    return Ok(vec![format!("file://{}", trimmed)]);
                }
                if trimmed.starts_with("file://") {
                    return Ok(vec![trimmed]);
                }
            }
        }
    }

    // Fallback: NSPasteboard file URLs via objc2
    read_file_uris_nspasteboard()
}

#[cfg(target_os = "macos")]
fn read_file_uris_nspasteboard() -> Result<Vec<String>, String> {
    unsafe {
        use objc2::msg_send;
        use objc2::runtime::{AnyClass, NSObject};
        use objc2_foundation::NSString;

        let cls = AnyClass::get(c"NSPasteboard").ok_or("NSPasteboard 类未找到")?;
        let pb: *mut NSObject = msg_send![cls, generalPasteboard];
        if pb.is_null() {
            return Err("无法获取 NSPasteboard 实例".to_string());
        }

        // 尝试读取 pasteboardItems
        let items: *mut NSObject = msg_send![pb, pasteboardItems];
        if items.is_null() {
            return Err("NSPasteboard 无 pasteboardItems".to_string());
        }

        let count: usize = msg_send![items, count];
        let mut paths = Vec::new();

        for i in 0..count {
            let item: *mut NSObject = msg_send![items, objectAtIndex: i];
            if item.is_null() {
                continue;
            }
            // 获取 NSPasteboardTypeFileURL (public.file-url)
            let type_key = NSString::from_str("public.file-url");
            let type_str: *mut NSObject = msg_send![
                item,
                stringForType: &*type_key
            ];
            if !type_str.is_null() {
                if let Ok(uri) = nsstring_to_string(type_str) {
                    paths.push(uri);
                }
            }
            if paths.is_empty() {
                // 兜底: 尝试 NSPasteboardTypeString
                let str_key = NSString::from_str("public.utf8-plain-text");
                let str: *mut NSObject = msg_send![
                    item,
                    stringForType: &*str_key
                ];
                if !str.is_null() {
                    if let Ok(s) = nsstring_to_string(str) {
                        let path = std::path::Path::new(&s);
                        if path.exists() {
                            paths.push(format!("file://{}", s));
                        }
                    }
                }
            }
        }

        if !paths.is_empty() {
            return Ok(paths);
        }

        // 老 API 方式: readObjectsForClasses
        let nsurl_cls = AnyClass::get(c"NSURL").ok_or("NSURL 类未找到")?;
        let nsurl_class_obj = nsurl_cls as *const AnyClass as *mut NSObject;

        let nsarray_cls = AnyClass::get(c"NSArray").ok_or("NSArray 类未找到")?;
        let class_arr: *mut NSObject =
            msg_send![nsarray_cls, arrayWithObjects: &nsurl_class_obj, count: 1usize];

        let urls: *mut NSObject =
            msg_send![pb, readObjectsForClasses: class_arr, options: std::ptr::null::<NSObject>()];
        if urls.is_null() {
            return Err("无法从 NSPasteboard 读取文件 URL".to_string());
        }

        let count: usize = msg_send![urls, count];
        for i in 0..count {
            let url: *mut NSObject = msg_send![urls, objectAtIndex: i];
            if url.is_null() {
                continue;
            }
            let path_obj: *mut NSObject = msg_send![url, path];
            if path_obj.is_null() {
                continue;
            }
            let cstr_ptr: *const std::ffi::c_char = msg_send![path_obj, UTF8String];
            if cstr_ptr.is_null() {
                continue;
            }
            let cstr = CStr::from_ptr(cstr_ptr);
            if let Ok(s) = cstr.to_str() {
                paths.push(format!("file://{}", s));
            }
        }

        if paths.is_empty() {
            return Err("无法从 NSPasteboard 读取文件路径".to_string());
        }
        Ok(paths)
    }
}

#[cfg(not(target_os = "macos"))]
fn read_file_uris_nspasteboard() -> Result<Vec<String>, String> {
    Err("非 macOS 平台".to_string())
}

unsafe fn nsstring_to_string(obj: *mut NSObject) -> Result<String, String> {
    use objc2::msg_send;

    let cstr_ptr: *const std::ffi::c_char = msg_send![obj, UTF8String];
    if cstr_ptr.is_null() {
        return Err("NSString UTF8String 为空".to_string());
    }
    let cstr = CStr::from_ptr(cstr_ptr);
    cstr.to_str()
        .map(|s| s.to_string())
        .map_err(|e| format!("NSString 转 UTF-8 失败: {}", e))
}
