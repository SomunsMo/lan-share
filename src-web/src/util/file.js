export const formatFileSize = (originBytes, decimals = 2) => {
    const bytes = Number(originBytes);
    if (isNaN(bytes)) return "-";
    if (bytes === 0) return "0B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + sizes[i];
}