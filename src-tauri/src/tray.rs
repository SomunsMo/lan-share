use std::sync::atomic::Ordering;
use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder, AppHandle, Emitter, Manager, WebviewWindow};

/// 创建系统托盘
pub fn create_tray_menu(app_handle: &AppHandle) {
    let show_item = MenuItem::with_id(app_handle, "show", "显示窗口", true, None::<&str>).expect("创建菜单项失败");
    let settings_item = MenuItem::with_id(app_handle, "settings", "设置", true, None::<&str>).expect("创建菜单项失败");
    let quit_item = MenuItem::with_id(app_handle, "quit", "退出", true, None::<&str>).expect("创建菜单项失败");
    
    let tray_menu = Menu::with_items(app_handle, &[&show_item, &settings_item, &quit_item]).expect("创建托盘菜单失败");
    
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
        .on_menu_event(|app, event| {
            handle_system_tray_menu_event(app, &event.id().0);
        })
        .show_menu_on_left_click(cfg!(target_os = "macos"))
        .build(app_handle)
        .expect("系统托盘构建失败");
}

/// 切换窗口显示/隐藏（双击托盘图标）
fn toggle_window_visibility(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let is_shown = window.is_visible().unwrap_or(false)
            && !window.is_minimized().unwrap_or(false);
        if is_shown {
            let _ = window.minimize();
        } else {
            show_and_focus_window(&window);
        }
    } else {
        recreate_and_show_window(app, None);
    }
}

/// 处理系统托盘菜单点击事件
pub fn handle_system_tray_menu_event(app: &AppHandle, id: &str) {
    match id {
        "show" => { show_window(app, None); }
        "settings" => {
            if app.get_webview_window("main").is_some() {
                let _ = app.emit("navigate", "/settings");
            } else {
                show_window(app, Some("/settings".to_string()));
            }
        }
        "quit" => {
            crate::QUITTING.store(true, Ordering::Relaxed);
            app.exit(0);
        }
        _ => {}
    }
}

/// 显示主窗口，initial_route 在窗口重建后导航用
pub(crate) fn show_window(app: &AppHandle, initial_route: Option<String>) {
    if let Some(window) = app.get_webview_window("main") {
        show_and_focus_window(&window);
    } else {
        recreate_and_show_window(app, initial_route);
    }
}

/// 恢复/显示窗口并聚焦
fn show_and_focus_window(window: &WebviewWindow) {
    let _ = window.unminimize().or_else(|_| window.show());
    let _ = window.set_focus();
    #[cfg(target_os = "macos")]
    crate::macos::set_dock_icon(true);
}

/// 重建并显示主窗口（窗口关闭后重新打开时使用）
fn recreate_and_show_window(app: &AppHandle, initial_route: Option<String>) {
    let window = crate::create_and_position_window(app, initial_route);
    let _ = window.set_focus();
}

