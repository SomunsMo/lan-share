import originAxios from "axios";
import { getClientId } from "./sse.js";

const request = (options) => {
    return new Promise((resolve, reject) => {
        const instance = originAxios.create({
            // 请求的基础地址，这里文件是HttpServer服务器响应的，所以不用设置
            // baseURL: "http://localhost1:3000",
            // 超时时间
            timeout: 10 * 1000,
        });

        //请求拦截
        instance.interceptors.request.use(config => {
            // const token = sessionStorage.getItem("ADMIN_TOKEN");
            // if (config.url !== URL_LOGIN) {
            //     config.headers.Authorization = "Bearer " + token;
            // }

            config.headers['X-Lan-Client-Id'] = getClientId();

            return config;
        }, err => {
            return err;
        })

        //响应拦截
        instance.interceptors.response.use(response => {
            if (response.status === 200) return response.data;
            return response;
        }, err => {
            if (err.response && err.response.data) {
                const data = err.response.data;
                // 标准化错误对象：确保 message 和 status 始终可用
                return Promise.reject({
                    ...data,
                    message: data.msg || data.message || '未知错误',
                    status: data.code || err.response.status,
                });
            }
            return Promise.reject(err);
        })


        // 将选项中的onUploadProgress传递给axios实例
        const axiosOptions = {
            ...options,
            onUploadProgress: options.onUploadProgress
        };
        
        instance(axiosOptions).then(res => {
            resolve(res);
        }).catch(err => {
            reject(err);
        })
    })
}

export default request;