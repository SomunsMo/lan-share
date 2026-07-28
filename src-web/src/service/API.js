import request from "./MyAxios.js";

// 获取上传记录（文本+图片）
export const getUploadRecordsAPI = () => {
    return request({
        method: "GET",
        url: "/upload/records"
    });
}

// 上传文本
export const uploadTextAPI = (text) => {
    return request({
        method: "POST",
        url: "/upload/text",
        data: {
            "textData": text
        }
    });
}

// 获取共享文件列表
export const getFileSharingAPI = (dir) => {
    return request({
        method: "GET",
        url: `/upload/file?dir=${dir ? dir : ""}`
    });
}

// 上传文件
export const uploadFileAPI = (file, dir, onUploadProgress) => {
    const url = dir ? `/upload/file?dir=${encodeURIComponent(dir)}` : "/upload/file";
    return request({
        method: "POST",
        url: url,
        data: file,
        headers: {
            "Content-Type": "multipart/form-data",
        },
        onUploadProgress: onUploadProgress
    })
}

// 重命名文件或文件夹
export const renameFileAPI = (dir, oldName, newName) => {
    const params = new URLSearchParams();
    if (dir) params.append("dir", dir);
    params.append("old_name", oldName);
    params.append("new_name", newName);
    return request({
        method: "PUT",
        url: `/rename/file?${params.toString()}`
    });
}

// 删除文件或文件夹
export const deleteFileAPI = (dir, fileName) => {
    const params = new URLSearchParams();
    if (dir) params.append("dir", dir);
    params.append("file_name", fileName);
    return request({
        method: "DELETE",
        url: `/delete/file?${params.toString()}`
    });
}

// 上传共享图片（Web 端粘贴图片）
export const uploadImageAPI = (imageBlob) => {
    return request({
        method: "POST",
        url: "/upload/image",
        data: imageBlob,
        headers: {
            "Content-Type": "application/octet-stream",
        },
        timeout: 60000,
    });
}

// 记录文本复制
export const recordCopyAPI = (contentId) => {
    return request({
        method: "POST",
        url: "/record/copy",
        data: { content_id: contentId }
    });
}

// 记录文件下载
export const recordDownloadAPI = (fileName, dir) => {
    return request({
        method: "POST",
        url: "/record/download",
        data: { file_name: fileName, dir: dir || "" }
    });
}

// 上传前检测：检查文件是否存在、上传功能、覆盖权限、磁盘剩余空间
export const preUploadCheckAPI = (dir, fileName) => {
    const params = new URLSearchParams();
    if (dir) params.append("dir", dir);
    params.append("file_name", fileName);
    return request({
        method: "GET",
        url: `/upload/file/check?${params.toString()}`
    });
}