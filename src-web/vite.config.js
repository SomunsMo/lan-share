import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {viteSingleFile} from "vite-plugin-singlefile";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), viteSingleFile()],
    server: {
        // 允许局域网访问
        host: true
    },
    build: {
        // 将打包的单html文件输出到rust下的静态资源目录中
        outDir: "../src-tauri/static/front"
    }
})
