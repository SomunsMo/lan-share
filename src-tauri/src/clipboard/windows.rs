use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use std::ptr;

/// 从剪贴板直接读取图片数据
/// WebView2 粘贴期间可能短暂锁住剪贴板，采用重试策略
pub(crate) fn read_image_data() -> Result<(u32, u32, Vec<u8>), String> {
    let mut last_err = String::new();
    for i in 0..4 {
        match arboard::Clipboard::new() {
            Ok(mut cb) => match cb.get_image() {
                Ok(img) => {
                    return Ok((img.width as u32, img.height as u32, img.bytes.to_vec()));
                }
                Err(e) => last_err = format!("get_image: {}", e),
            },
            Err(e) => last_err = format!("Clipboard::new: {}", e),
        }
        if i < 3 {
            std::thread::sleep(std::time::Duration::from_millis(30 * (i + 1)));
        }
    }
    Err(last_err)
}

/// 从剪贴板读取文件 URI 列表（Win32 CF_HDROP）
/// WebView2 粘贴期间可能短暂锁住剪贴板，采用重试策略
pub(crate) fn read_file_uris() -> Result<Vec<String>, String> {
    let mut last_err = String::new();
    for i in 0..4 {
        match try_read_hdrop() {
            Ok(uris) => return Ok(uris),
            Err(e) => last_err = e,
        }
        if i < 3 {
            std::thread::sleep(std::time::Duration::from_millis(30 * (i + 1)));
        }
    }
    Err(last_err)
}

fn try_read_hdrop() -> Result<Vec<String>, String> {
    unsafe {
        if OpenClipboard(ptr::null_mut()) == 0 {
            return Err("打开剪贴板失败".to_string());
        }
        let result = read_hdrop_inner();
        CloseClipboard();
        result
    }
}

unsafe fn read_hdrop_inner() -> Result<Vec<String>, String> {
    let hdrop = GetClipboardData(CF_HDROP);
    if hdrop.is_null() {
        return Err("剪贴板中没有文件数据(CF_HDROP)".to_string());
    }

    let file_count = DragQueryFileW(hdrop, 0xFFFFFFFF, ptr::null_mut(), 0);
    if file_count == 0 {
        return Err("剪贴板中没有文件".to_string());
    }

    let mut uris = Vec::with_capacity(file_count as usize);
    for i in 0..file_count {
        // 获取路径长度（不含 null 终止符）
        let needed = DragQueryFileW(hdrop, i, ptr::null_mut(), 0);
        if needed == 0 {
            continue;
        }
        let mut buf = vec![0u16; (needed + 1) as usize];
        DragQueryFileW(hdrop, i, buf.as_mut_ptr(), needed + 1);
        let path = OsString::from_wide(&buf[..needed as usize]);
        if let Ok(s) = path.into_string() {
            uris.push(format!("file:///{}", s.replace('\\', "/")));
        }
    }

    if uris.is_empty() {
        return Err("无法读取剪贴板中的文件路径".to_string());
    }
    Ok(uris)
}

// ========== Win32 FFI ==========

type HANDLE = *mut std::ffi::c_void;
type HDROP = HANDLE;
type UINT = u32;
type BOOL = i32;

const CF_HDROP: UINT = 15;

#[link(name = "shell32")]
extern "system" {
    fn DragQueryFileW(
        hDrop: HDROP,
        iFile: UINT,
        lpszFile: *mut u16,
        cch: UINT,
    ) -> UINT;
}

extern "system" {
    fn OpenClipboard(hwnd: *mut std::ffi::c_void) -> BOOL;
    fn CloseClipboard() -> BOOL;
    fn GetClipboardData(uFormat: UINT) -> HANDLE;
}
