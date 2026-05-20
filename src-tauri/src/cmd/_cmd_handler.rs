use crate::cmd::system;

pub fn get_cmd_handler() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync + 'static
{
    tauri::generate_handler![
        system::get_local_ip,
        system::clear_sharing_text,
        system::get_text_sharing_history,
        system::delete_text_sharing_record,
        system::share_text_to_lan,
        system::set_sharing_directory,
        system::get_sharing_directory,
        system::get_upload_enabled,
        system::set_upload_enabled,
        system::get_rename_enabled,
        system::set_rename_enabled,
        system::get_delete_enabled,
        system::set_delete_enabled,
        system::get_autostart,
        system::set_autostart,
        system::get_http_port,
        system::set_http_port,
        system::get_running_port
    ]
}
