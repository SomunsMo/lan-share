import React, { useEffect } from "react";
import "./AppLight.css";
import Navbar from "./components/navbar/index.jsx";
import {useRoutes, useNavigate} from "react-router";
import {routes} from "./pages/_router-map.jsx";
import { DialogProvider } from "./components/dialog/index.jsx";
import { ToastProvider } from "./components/toast/index.jsx";
import {invoke} from "@tauri-apps/api/core";
import {listen} from "@tauri-apps/api/event";

function App() {
    const navigate = useNavigate();

    // 应用主题设置
    const applyTheme = (theme) => {
        const html = document.documentElement;
        html.classList.remove('dark', 'light');
        html.removeAttribute('data-mui-color-scheme');
        if (theme === 'dark') {
            html.classList.add('dark');
            html.setAttribute('data-mui-color-scheme', 'dark');
        } else if (theme === 'light') {
            html.classList.add('light');
            html.setAttribute('data-mui-color-scheme', 'light');
        }
    };

    // 加载主题设置
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const theme = await invoke('get_theme_setting');
                applyTheme(theme);
            } catch (e) {
                console.error('加载主题设置失败:', e);
            }
        };
        loadTheme();
    }, []);

    // 加载主题色并初始化 MUI palette CSS 变量
    useEffect(() => {
        const loadThemeColor = async () => {
            try {
                const json = await invoke('get_theme_color');
                const { h, s, l } = JSON.parse(json);
                const html = document.documentElement;
                html.style.setProperty('--hue-primary', h);
                html.style.setProperty('--sat-primary', `${s}%`);
                html.style.setProperty('--lig-primary', `${l}%`);
            } catch (e) {
                // 使用 AppLight.css 中的默认值
            }
            // 始终设置 --mui-palette-* 变量（默认值已由 AppLight.css 提供）
            const html = document.documentElement;
            const muiRoots = document.querySelectorAll('[data-mui-color-scheme]');
            (muiRoots.length ? [...muiRoots] : [html]).forEach(el => {
                el.style.setProperty('--mui-palette-primary-main', 'var(--primary)');
                el.style.setProperty('--mui-palette-primary-contrastText', 'var(--on-primary)');
                el.style.setProperty('--mui-palette-primary-dark', 'var(--primary-hover)');
                el.style.setProperty('--mui-palette-secondary-main', 'var(--secondary)');
                el.style.setProperty('--mui-palette-background-default', 'var(--surface-bright)');
                el.style.setProperty('--mui-palette-background-paper', 'var(--surface-container-lowest)');
            });
        };
        loadThemeColor();
    }, []);

    // 屏蔽右键菜单
    const disableContextMenu = (e) => {
        e.preventDefault();
        return false;
    };

    // 监听托盘菜单导航事件
    useEffect(() => {
        const unlisten = listen("navigate", (event) => {
            navigate(event.payload);
        });
        return () => {
            unlisten.then(fn => fn());
        };
    }, [navigate]);

    // 组件挂载时添加事件监听器
    useEffect(() => {
        document.addEventListener('contextmenu', disableContextMenu);

        // 清理函数：组件卸载时移除事件监听器
        return () => {
            document.removeEventListener('contextmenu', disableContextMenu);
        };
    }, []);

    return (
        <ToastProvider>
            <DialogProvider>
                <div className="container">
                    <Navbar/>
                    <main className={"content"}>
                        {useRoutes(routes)}
                    </main>
                </div>
            </DialogProvider>
        </ToastProvider>
    );
}

export default App;