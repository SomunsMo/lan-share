import request from "./MyAxios.js";

// 查询访问密码状态（公开接口）
export const getAuthStatusAPI = () => {
    return request({
        method: "GET",
        url: "/auth/status"
    });
}

// 使用访问密码登录（公开接口，成功后服务端写入会话 Cookie）
export const loginAPI = (password) => {
    return request({
        method: "POST",
        url: "/auth/login",
        data: {password}
    });
}

// 登出（公开接口，清除服务端会话与 Cookie）
export const logoutAPI = () => {
    return request({
        method: "POST",
        url: "/auth/logout"
    });
}
