import React, { useEffect } from "react";
import "./AppLight.css";
import "./AppDark.css";
import Navbar from "./components/navbar/index.jsx";
import {useRoutes} from "react-router";
import {routes} from "./pages/_router-map.jsx";
import { DialogProvider, useDialog } from "./components/dialog/index.jsx";
import { ToastProvider } from "./components/toast/index.jsx";
import { listen } from "@tauri-apps/api/event";
import { emit } from "@tauri-apps/api/event";

function PortOccupiedListener() {
    const { showDialog } = useDialog();

    useEffect(() => {
        // 监听Rust端推送的端口占用事件
        const unlisten = listen("port-occupied", (event) => {
            const port = event.payload;
            showDialog({
                title: "端口被占用",
                content: `端口 ${port} 已被占用，请关闭占用的程序或设置一个新的端口`,
                buttons: [
                    { label: "知道了", value: true, primary: true },
                ],
            });
        });

        // 通知Rust端：前端已就绪，可以推送事件了
        emit("app-ready");

        return () => {
            unlisten.then(fn => fn());
        };
    }, [showDialog]);

    return null;
}

function App() {
    // 屏蔽右键菜单
    const disableContextMenu = (e) => {
        e.preventDefault();
        return false;
    };

    // 组件挂载时添加事件监听器
    useEffect(() => {
        document.addEventListener('contextmenu', disableContextMenu);
        
        // 清理函数：组件卸载时移除事件监听器
        return () => {
            document.removeEventListener('contextmenu', disableContextMenu);
        };
    }, []);

    return (
        <DialogProvider>
            <ToastProvider>
                <PortOccupiedListener />
                <div className="container">
                    <Navbar/>
                    <main className={"content"}>
                        {useRoutes(routes)}
                    </main>
                </div>
            </ToastProvider>
        </DialogProvider>
    );
}

export default App;