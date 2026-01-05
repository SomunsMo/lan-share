# Lan Share(Tauri)

一个专注于局域网内文本及文件的分享工具，文件分享的传输速度取决于你的网速。

## 技术栈

### 前端

- Tauri
- React
- Vite

### 后端

- Rust

## 项目结构

 ```
  .
  | src         服务端程序页面
  | src-tauri   服务后端
  | src-web     其他设备访问的页面
```

## 原理*
*
在服务端使用Tauri渲染UI，在启动时Rust为后端会启动一个HttpServer，用于其他设备在浏览器进行相关操作。
