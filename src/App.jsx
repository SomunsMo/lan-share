import React, { useEffect } from "react";
import "./AppLight.css";
import "./AppDark.css";
import Navbar from "./components/navbar/index.jsx";
import {useRoutes} from "react-router";
import {routes} from "./pages/_router-map.jsx";
import { DialogProvider } from "./components/dialog/index.jsx";
import { ToastProvider } from "./components/toast/index.jsx";

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