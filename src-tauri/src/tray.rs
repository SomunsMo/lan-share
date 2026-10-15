use std::sync::{atomic::Ordering, OnceLock};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, WebviewWindow,
};

static SHOW_ITEM: OnceLock<MenuItem<tauri::Wry>> = OnceLock::new();
static SETTINGS_ITEM: OnceLock<MenuItem<tauri::Wry>> = OnceLock::new();
static QUIT_ITEM: OnceLock<MenuItem<tauri::Wry>> = OnceLock::new();

fn make_tray_icon(app_handle: &AppHandle, is_template: bool) -> tauri::image::Image<'_> {
    if is_template {
        let img = image::load_from_memory(include_bytes!("../icons/tray-template.png"))
            .expect("加载托盘模板图标失败")
            .into_rgba8();
        let (w, h) = img.dimensions();
        tauri::image::Image::new_owned(img.into_raw(), w, h)
    } else {
        app_handle.default_window_icon().cloned().expect("获取应用图标失败")
    }
}

/// 创建系统托盘
pub fn create_tray_menu(app_handle: &AppHandle) {
    let show_item = MenuItem::with_id(app_handle, "show", "显示窗口", true, None::<&str>).expect("创建菜单项失败");
    let settings_item = MenuItem::with_id(app_handle, "settings", "设置", true, None::<&str>).expect("创建菜单项失败");
    let quit_item = MenuItem::with_id(app_handle, "quit", "退出", true, None::<&str>).expect("创建菜单项失败");

    let tray_menu = Menu::with_items(app_handle, &[&show_item, &settings_item, &quit_item]).expect("创建托盘菜单失败");

    #[cfg(target_os = "macos")]
    let is_template = crate::config::config::TRAY_ICON_MODE
        .get()
        .map(|s| s.as_str() == "template")
        .unwrap_or(true);
    #[cfg(not(target_os = "macos"))]
    let is_template = false;

    let icon = make_tray_icon(app_handle, is_template);

    TrayIconBuilder::with_id("main-tray")
        .menu(&tray_menu)
        .icon(icon)
        .icon_as_template(is_template)
        .tooltip("LAN Share")
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                toggle_window_visibility(tray.app_handle());
            }
        })
        .on_menu_event(|app, event| {
            handle_system_tray_menu_event(app, &event.id().0);
        })
        .show_menu_on_left_click(cfg!(target_os = "macos"))
        .build(app_handle)
        .expect("系统托盘构建失败");

    let _ = SHOW_ITEM.set(show_item);
    let _ = SETTINGS_ITEM.set(settings_item);
    let _ = QUIT_ITEM.set(quit_item);
}

/// 运行时更新托盘图标模式
pub fn update_tray_icon(app_handle: &AppHandle, mode: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let is_template = mode == "template";
    #[cfg(not(target_os = "macos"))]
    let is_template = false;

    let icon = make_tray_icon(app_handle, is_template);

    if let Some(tray) = app_handle.tray_by_id("main-tray") {
        tray.set_icon(Some(icon)).map_err(|e| format!("更新托盘图标失败: {}", e))?;
        tray.set_icon_as_template(is_template).map_err(|e| format!("设置图标模板模式失败: {}", e))?;
    }
    Ok(())
}

/// 更新托盘菜单项文本（由 IPC 命令在语言切换时调用）
pub fn update_tray_menu_texts(show: &str, settings: &str, quit: &str) -> Result<(), String> {
    if let Some(item) = SHOW_ITEM.get() {
        item.set_text(show).map_err(|e| format!("更新托盘菜单项失败: {}", e))?;
    }
    if let Some(item) = SETTINGS_ITEM.get() {
        item.set_text(settings).map_err(|e| format!("更新托盘菜单项失败: {}", e))?;
    }
    if let Some(item) = QUIT_ITEM.get() {
        item.set_text(quit).map_err(|e| format!("更新托盘菜单项失败: {}", e))?;
    }
    Ok(())
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
            if let Some(window) = app.get_webview_window("main") {
                // 静默启动时窗口隐藏，先显示/聚焦再导航，否则 navigate 事件收不到反馈
                show_and_focus_window(&window);
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
    // 对"从未显示过、仅隐藏"的窗口（--silent 静默启动时），unminimize() 是空操作、
    // 不会真正显示窗口，必须先显式 show()。
    if window.is_visible().unwrap_or(false) {
        let _ = window.unminimize();
    } else {
        let _ = window.show();
    }
    // Linux：隐藏期间设置的几何不被合成器固化，show 后需重设一次，
    // 并纠正被合成器错误置为最大化的窗口。
    #[cfg(target_os = "linux")]
    crate::fix_normal_rect_after_show(window);
    let _ = window.set_focus();
    #[cfg(target_os = "macos")]
    crate::macos::set_dock_icon(true);
}

/// 重建并显示主窗口（窗口关闭后重新打开时使用）
fn recreate_and_show_window(app: &AppHandle, initial_route: Option<String>) {
    let window = crate::create_and_position_window(app, initial_route);
    let _ = window.set_focus();
    #[cfg(target_os = "macos")]
    crate::macos::set_dock_icon(true);
}
