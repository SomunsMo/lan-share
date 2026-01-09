// 格式化文件大小
export const formatFileSize = (originBytes, decimals = 2) => {
    const bytes = Number(originBytes);
    console.log(originBytes, bytes)
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

