#[cfg(target_os = "macos")]
pub fn set_dock_icon(visible: bool) {
    unsafe {
        let cls = objc2::runtime::AnyClass::get(c"NSApplication").unwrap();
        let app: *mut objc2::runtime::NSObject = objc2::msg_send![cls, sharedApplication];
        let policy: isize = if visible { 0 } else { 1 };
        let _: () = objc2::msg_send![app, setActivationPolicy: policy];
    }
}
