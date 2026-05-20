import request from "./MyAxios.js";

// 获取共享文本列表
export const getTextSharingAPI = () => {
    return request({
        method: "GET",
        url: "/upload/text"
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

// 获取网页端权限配置
export const getPermissionsAPI = () => {
    return request({
        method: "GET",
        url: "/config/permissions"
    });
}