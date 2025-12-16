use std::path::PathBuf;
use std::sync::OnceLock;

/// 软件配置目录
pub static CONFIG_DIR: OnceLock<PathBuf> = OnceLock::new();
pub fn get_config_dir() -> &'static PathBuf {
    CONFIG_DIR.get().unwrap()
}

/// 文件共享根目录  
/// **注意：用户不能访问当前目录的更高级目录**
pub static FILE_SHARING_ROOT_DIR: OnceLock<PathBuf> = OnceLock::new();
pub fn get_sharing_root() -> &'static PathBuf {
    FILE_SHARING_ROOT_DIR.get().unwrap()
}
