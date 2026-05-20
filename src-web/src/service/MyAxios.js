import originAxios from "axios";

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

            return config;
        }, err => {
            return err;
        })

        //响应拦截
        instance.interceptors.response.use(response => {
            // 如果请求的相应正常，则返回响应体（避免调用时每次都添加.data）
            if (response.status === 200) return response.data;

            // 如果请求的响应不正常，则返回完整响应
            return response;
        }, err => {
            return err;
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