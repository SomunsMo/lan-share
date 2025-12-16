// 接口路径规范工具模块文件

// 接口路径规范函数
pub fn path_normalizer(origin_path: &str) -> String {
    // 排除根路径
    if origin_path.is_empty() || origin_path == "/" {
        return String::from("/");
    }

    // 移除重复的路径斜杠
    let mut path = remove_repeat_dash(origin_path);

    // 去除路径结尾可能存在的'/'
    path = path.trim_end_matches('/').to_string();

    // 增加路径开头的'/'（如果没有的话）
    if !path.starts_with('/') {
        path.insert_str(0, "/");
    }

    // 返回处理后的路径
    path
}

// 移除重复的路径斜杠
fn remove_repeat_dash(origin_path: &str) -> String {
    let mut result = String::with_capacity(origin_path.len());
    let mut last_char = ' ';

    for ch in origin_path.chars() {
        if ch == '/' && last_char == '/' {
            // 跳过连续的斜杠
            continue;
        }
        result.push(ch);
        last_char = ch;
    }

    result
}
