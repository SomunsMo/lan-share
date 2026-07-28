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
/// 1. 尝试 arboard::get_text()（少数环境可能同时设了 text/plain）
/// 2. 子进程调用 wl-paste（Wayland）或 xclip（X11）读取 text/uri-list
pub(crate) fn read_file_uris() -> Result<Vec<String>, String> {
    // Try arboard text first
    if let Ok(mut cb) = arboard::Clipboard::new() {
        if let Ok(text) = cb.get_text() {
            let uris: Vec<String> = text
                .lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty() && l.starts_with("file://"))
                .collect();
            if !uris.is_empty() {
                return Ok(uris);
            }
        }
    }

    // Subprocess fallback for text/uri-list
    read_uris_via_subprocess()
}

fn read_uris_via_subprocess() -> Result<Vec<String>, String> {
    let cmds = [
        "wl-paste --type text/uri-list 2>/dev/null",
        "wl-paste 2>/dev/null",
        "xclip -o -t text/uri-list -selection clipboard 2>/dev/null",
        "xclip -o -selection clipboard 2>/dev/null",
    ];

    for cmd in &cmds {
        let output = std::process::Command::new("sh")
            .arg("-c")
            .arg(cmd)
            .output();

        match output {
            Ok(output) if output.status.success() => {
                let text = String::from_utf8_lossy(&output.stdout);
                let uris: Vec<String> = text
                    .lines()
                    .map(|l| l.trim().to_string())
                    .filter(|l| !l.is_empty())
                    .collect();
                if !uris.is_empty() {
                    // 过滤出 file:// URIs 或有效路径
                    let file_uris: Vec<String> = uris
                        .into_iter()
                        .filter(|u| {
                            u.starts_with("file://")
                                || u.starts_with('/')
                                || std::path::Path::new(u).exists()
                        })
                        .collect();
                    if !file_uris.is_empty() {
                        return Ok(file_uris);
                    }
                }
            }
            _ => {}
        }
    }

    Err("无法从剪贴板读取文件 URI".to_string())
}
