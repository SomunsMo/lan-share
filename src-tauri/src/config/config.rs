use std::path::PathBuf;
use std::sync::OnceLock;
use log::error;
use tokio::sync::RwLock;

/// 软件配置目录
pub static CONFIG_DIR: OnceLock<PathBuf> = OnceLock::new();
pub fn get_config_dir() -> &'static PathBuf {
    CONFIG_DIR.get().unwrap()
}

lazy_static::lazy_static! {
    /// 文件共享根目录  
    /// **注意：用户不能访问当前目录的更高级目录**
    pub static ref FILE_SHARING_ROOT_DIR: RwLock<PathBuf> = RwLock::new(std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
}

pub async fn get_sharing_root() -> tokio::sync::RwLockReadGuard<'static, PathBuf> {
    FILE_SHARING_ROOT_DIR.read().await
}

pub async fn set_sharing_root_new(path: PathBuf) -> Result<(), String> {
    // 验证路径是否存在并且是一个目录
    if !path.exists() {
        return Err("路径不存在".to_string());
    }
    
    if !path.is_dir() {
        return Err("请选择一个有效的目录".to_string());
    }
    
    // 尝试访问目录，确保有读取权限（使用标准库的同步方法）
    match std::fs::read_dir(&path) {
        Ok(_) => {},
        Err(e) => {
            error!("无法访问目录 {:?}: {}", path, e);
            return Err(format!("无法访问目录: {}", e));
        }
    };
    
    // 获取写锁并更新共享根目录
    let mut guard = FILE_SHARING_ROOT_DIR.write().await;
    *guard = path;
    Ok(())
}



/// 初始化共享根目录（从配置中加载）
pub async fn init_sharing_root_from_config() -> Result<(), String> {
    use crate::db::dao::config_dao;
    
    match config_dao::get_config_value("file_sharing_root_dir").await {
        Ok(Some(saved_path)) => {
            let path = PathBuf::from(saved_path);
            if path.exists() && path.is_dir() {
                // 更新共享根目录
                match set_sharing_root_new(path).await {
                    Ok(()) => {
                        log::info!("从配置中加载共享根目录成功");
                        Ok(())
                    },
                    Err(e) => {
                        log::warn!("设置共享根目录失败: {}", e);
                        Ok(())
                    }
                }
            } else {
                log::warn!("保存的共享根目录不存在或不是目录: {:?}", path);
                // 设置默认目录
                let default_path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
                set_sharing_root_new(default_path).await.map_err(|_| "无法设置默认共享根目录".to_string())
            }
        },
        Ok(None) => {
            // 没有找到配置，使用默认目录
            log::info!("未找到共享根目录配置，使用默认目录");
            let default_path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            set_sharing_root_new(default_path).await.map_err(|_| "无法设置默认共享根目录".to_string())
        },
        Err(e) => {
            log::error!("读取共享根目录配置失败: {}", e);
            let default_path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            set_sharing_root_new(default_path).await.map_err(|_| "无法设置默认共享根目录".to_string())
        }
    }
}
