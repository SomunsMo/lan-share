pub fn set_dock_icon(_visible: bool) {
    #[cfg(target_os = "macos")]
    unsafe {
        let cls = objc2::runtime::AnyClass::get(c"NSApplication").unwrap();
        let app: *mut objc2::runtime::NSObject = objc2::msg_send![cls, sharedApplication];
        let policy: isize = if _visible { 0 } else { 1 };
        let _: () = objc2::msg_send![app, setActivationPolicy: policy];
    }
}
