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
        system::get_sharing_directory
    ]
}
