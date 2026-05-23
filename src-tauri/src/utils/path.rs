use std::path::Path;

/// 将路径中的分隔符统一为正斜杠（跨平台兼容）
/// 存储到数据库、展示给用户、返回给前端时使用，确保视觉统一
pub fn normalize_path(path: impl AsRef<Path>) -> String {
    path.as_ref().to_string_lossy().replace('\\', "/")
}
