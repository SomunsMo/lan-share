use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder, AppHandle, Manager};

/// 创建系统托盘
pub fn create_tray_menu(app_handle: &AppHandle) {
    let show_item = MenuItem::with_id(app_handle, "show", "显示窗口", true, None::<&str>).expect("创建菜单项失败");
    let quit_item = MenuItem::with_id(app_handle, "quit", "退出", true, None::<&str>).expect("创建菜单项失败");
    
    let tray_menu = Menu::with_items(app_handle, &[&show_item, &quit_item]).expect("创建托盘菜单失败");
    
    
    // 通过应用配置的图标来设置托盘图标
    let icon = app_handle.default_window_icon().cloned().expect("获取应用图标失败");
    
    TrayIconBuilder::with_id("main-tray")
        .menu(&tray_menu)
        .icon(icon)
        .icon_as_template(false)
        .tooltip("LAN Share")
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                toggle_window_visibility(&tray.app_handle());
            }
        })
        .show_menu_on_left_click(cfg!(target_os = "macos"))  // macOS下左键显示菜单，其他平台保持原逻辑
        .build(app_handle)
        .expect("系统托盘构建失败");
}
/// 切换窗口显示/隐藏状态
fn toggle_window_visibility(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        match window.is_visible().unwrap_or(false) {
            true => {
                let _ = window.hide();
            }
            false => {
                show_and_focus_window(&window);
            }
        }
    }
}

/// 处理系统托盘菜单点击事件
pub fn handle_system_tray_menu_event(app: &AppHandle, id: &str) {
    match id {
        "show" => show_window(app),
        "quit" => {
            app.exit(0); // 安全退出应用
        }
        _ => {}
    }
}

/// 显示主窗口
pub(crate) fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        show_and_focus_window(&window);
    }
}

/// 辅助函数：显示窗口并聚焦
fn show_and_focus_window(window: &tauri::WebviewWindow) {
    let _ = window.show();
    let _ = window.set_focus();
}

