// 格式化文件大小
export const formatFileSize = (originBytes, decimals = 2) => {
    const bytes = Number(originBytes);
    if (isNaN(bytes)) return "-";
    if (bytes === 0) return "0B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + sizes[i];
}

// 获取文件后缀
export const getFileSuffix = (fileName) => {
    const suffix = fileName.split(".").pop();
    if (!suffix || suffix === fileName) {
        console.error("无法获取文件后缀:{}", fileName);
    }
    return suffix.toLowerCase();
}

// 复制文本到剪贴板（兼容非 HTTPS 环境）
export const copyToClipboard = async (text) => {
    // 优先使用 Clipboard API（HTTPS / localhost）
    if (navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Clipboard API 失败时降级
        }
    }

    // 降级方案：使用 document.execCommand('copy')
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        return true;
    } catch {
        return false;
    } finally {
        document.body.removeChild(textarea);
    }
}

