use crate::cmd::system;

pub fn get_cmd_handler() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync + 'static
{
    tauri::generate_handler![system::get_local_ip, system::clear_sharing_text]
}
