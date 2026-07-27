import {invoke} from '@tauri-apps/api/core';

export const copyText = async (text) => {
    await invoke('copy_text_to_clipboard', {text});
}
