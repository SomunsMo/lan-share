import {invoke} from '@tauri-apps/api/core';

/**
 * 复制共享图片到系统剪贴板
 * @param {string} imagePath 图片在共享目录中的相对路径（图片记录 content 中的 path 字段）
 */
export const copySharedImage = async (imagePath) => {
    await invoke('copy_image_to_clipboard', {imagePath});
}
