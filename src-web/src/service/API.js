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
export const uploadFileAPI = (file) => {
    return request({
        method: "POST",
        url: "/upload/file",
        data: file,
        headers: {
            "Content-Type": "multipart/form-data",
        }
    })
}