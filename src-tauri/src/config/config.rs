use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::OnceLock;
use log::error;
use regex::Regex;
use tokio::sync::RwLock;

/// 开源仓库地址（编译时定死，用于关于页链接和版本更新检查）
pub const REPO_URL: &str = "https://github.com/SomunsMo/lan-share";
/// GitHub API 地址（用于检查新版本）
pub const REPO_API: &str = "https://api.github.com/repos/SomunsMo/lan-share";

/// 窗口状态JSON（init中从DB读取，供setup同步使用）
pub static WINDOW_STATE_JSON: OnceLock<Option<String>> = OnceLock::new();

/// 软件配置目录
pub static CONFIG_DIR: OnceLock<PathBuf> = OnceLock::new();
pub fn get_config_dir() -> &'static PathBuf {
    CONFIG_DIR.get().unwrap()
}

/// 当前HTTP服务运行端口（启动时设定，重启后才变更）
pub static RUNNING_HTTP_PORT: OnceLock<u16> = OnceLock::new();
pub fn get_running_http_port() -> &'static u16 {
    RUNNING_HTTP_PORT.get().unwrap_or(&3000)
}

/// 配置的HTTP端口（在init中从DB读取，供setup同步使用）
pub static CONFIGURED_HTTP_PORT: OnceLock<u16> = OnceLock::new();
pub fn get_configured_http_port() -> &'static u16 {
    CONFIGURED_HTTP_PORT.get().unwrap_or(&3000)
}

/// 被占用的端口号（setup同步检测后设置，前端发app-ready时读取并通知）
pub static OCCUPIED_PORT: OnceLock<u16> = OnceLock::new();

/// 是否已配置共享根目录（首次运行时为 false，用户通过设置页面或首次运行对话框配置后为 true）
pub static IS_SHARING_ROOT_CONFIGURED: AtomicBool = AtomicBool::new(false);
pub fn is_sharing_root_configured() -> bool {
    IS_SHARING_ROOT_CONFIGURED.load(Ordering::Relaxed)
}
pub fn set_sharing_root_configured(val: bool) {
    IS_SHARING_ROOT_CONFIGURED.store(val, Ordering::Release);
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

/// 排除规则缓存
pub struct ExcludeFilter {
    pub exclude_system_files: bool,
    pub compiled_patterns: Vec<Regex>,
}

static EXCLUDE_FILTER: OnceLock<RwLock<ExcludeFilter>> = OnceLock::new();

pub async fn get_exclude_filter() -> tokio::sync::RwLockReadGuard<'static, ExcludeFilter> {
    EXCLUDE_FILTER
        .get_or_init(|| {
            RwLock::new(ExcludeFilter {
                exclude_system_files: true,
                compiled_patterns: Vec::new(),
            })
        })
        .read()
        .await
}

/// 从 DB 重新加载排除规则并编译正则
pub async fn reload_exclude_filter() {
    use crate::db::dao::config_dao;

    let exclude_sys = config_dao::get_config_value("exclude_system_files")
        .await
        .ok()
        .flatten()
        .and_then(|v| v.parse::<bool>().ok())
        .unwrap_or(true);

    let mut compiled: Vec<Regex> = Vec::new();

    if exclude_sys {
        const SYSTEM_PATTERNS: &[&str] = &[
            r"^\.DS_Store$",
            r"^\._.*$",
            r"^\.localized$",
            r"^desktop\.ini$",
            r"^Thumbs\.db$",
            r"^\.Trash.*$",
            r"^\.Trashes$",
            r"^\.directory$",
            r"^\.hidden$",
            r"^\$RECYCLE\.BIN$",
            r"^~\$.*",
            r"\.tmp$",
            r"\.temp$",
        ];
        for p in SYSTEM_PATTERNS {
            if let Ok(re) = Regex::new(p) {
                compiled.push(re);
            }
        }
    }

    if let Ok(Some(json)) = config_dao::get_config_value("exclude_patterns").await {
        if let Ok(patterns) = serde_json::from_str::<Vec<String>>(&json) {
            for p in &patterns {
                if let Ok(re) = Regex::new(p) {
                    compiled.push(re);
                }
            }
        }
    }

    let mut guard = EXCLUDE_FILTER
        .get_or_init(|| {
            RwLock::new(ExcludeFilter {
                exclude_system_files: true,
                compiled_patterns: Vec::new(),
            })
        })
        .write()
        .await;
    guard.exclude_system_files = exclude_sys;
    guard.compiled_patterns = compiled;
}
