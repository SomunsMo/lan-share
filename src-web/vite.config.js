import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {viteSingleFile} from "vite-plugin-singlefile";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), viteSingleFile()],
    // 配置路径别名
    resolve: {
        alias: {
            // '@' 指向 项目根目录/src
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        // 允许局域网访问
        host: true
    },
    build: {
        // 打包后的 HTML 由 build.rs 读取并嵌入到可执行程序
        outDir: "dist"
    }
})
