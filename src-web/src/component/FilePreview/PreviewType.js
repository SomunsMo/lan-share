// 预览类型工具：由后缀推导预览渲染类型（文本/图片/音频/PDF/Excel）。
// 后缀集合须与后端 file_sharing_handler.rs 的 PREVIEW_*_SUFFIXES 及 is_previewable 逐字保持一致（须镜像修改）。

const PREVIEW_TEXT_SUFFIXES = new Set([
    "txt", "log", "md", "markdown", "csv", "json", "xml", "yaml", "yml",
    "ini", "cfg", "conf", "toml", "env", "html", "htm", "css", "js", "ts",
    "py", "rs", "java", "c", "h", "cpp", "go", "sql",
]);

const PREVIEW_IMAGE_SUFFIXES = new Set(["bmp", "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "tiff"]);

// 与后端 PREVIEW_AUDIO_SUFFIXES 保持一致（浏览器原生支持集）
const PREVIEW_AUDIO_SUFFIXES = new Set(["mp3", "wav", "ogg", "opus", "flac", "m4a", "aac"]);

// 与后端 PREVIEW_EXCEL_SUFFIXES 保持一致（exceljs 解析，仅 xlsx）
const PREVIEW_EXCEL_SUFFIXES = new Set(["xlsx"]);

export const getPreviewType = (suffix) => {
    if (PREVIEW_IMAGE_SUFFIXES.has(suffix)) return 'image';
    if (suffix === 'pdf') return 'pdf';
    if (PREVIEW_TEXT_SUFFIXES.has(suffix)) return 'text';
    if (PREVIEW_EXCEL_SUFFIXES.has(suffix)) return 'excel';
    if (PREVIEW_AUDIO_SUFFIXES.has(suffix)) return 'audio';
    return null;
};

export const isPreviewable = (suffix) => getPreviewType(suffix) !== null;