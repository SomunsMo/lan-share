import React, {useEffect, useState} from 'react';
import AppStyle from "./AppStyle.js";
import FileSharing from "./component/FileSharing/index.js";
import TextSharing from "./component/TextSharing/TextSharing.jsx";
import QrCodeButton from "./component/QrCode/index.jsx";
import {DialogProvider} from "./component/Dialog/index.jsx";
import {ToastProvider} from "./component/Toast/index.jsx";
import {useTranslation} from "react-i18next";
import { changeLanguage } from "./i18n.ts";
import { startEventSource, stopEventSource } from "./service/sse.js";
import SseStatusBanner from "./component/SseStatusBanner/index.jsx";
import PortChangedBanner from "./component/PortChangedBanner/index.jsx";
import SideNav from "./component/SideNav/index.jsx";
import Login from "./component/Login/index.jsx";
import {ROUTE_TEXT, ROUTE_FILES} from "./util/route.js";
import {useHashRoute} from "./util/useHashRoute.js";
import {getAuthStatusAPI, logoutAPI} from "./service/auth.js";
import {onUnauthorized} from "./service/authEvents.js";

const THEME_KEY = 'lan-share-theme';

function App() {
    const { t, i18n } = useTranslation();
    const [route, navigate] = useHashRoute();
    // null 表示正在检查登录状态
    const [auth, setAuth] = useState(null);
    const [theme, setTheme] = useState(() => {
        try {
            const saved = localStorage.getItem(THEME_KEY);
            return saved || 'system';
        } catch {
            return 'system';
        }
    });

    const applyTheme = (t) => {
        const html = document.documentElement;
        html.classList.remove('dark', 'light');
        if (t === 'dark') html.classList.add('dark');
        else if (t === 'light') html.classList.add('light');
    };

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    useEffect(() => {
        let cancelled = false;

        getAuthStatusAPI()
            .then((res) => {
                const status = res?.data;
                if (!cancelled) setAuth(status || {password_enabled: false, authenticated: true});
            })
            .catch(() => {
                // 状态查询失败时不阻断页面，后续接口返回 401 会再切回登录页
                if (!cancelled) setAuth({password_enabled: false, authenticated: true});
            });

        const offUnauthorized = onUnauthorized(() => {
            stopEventSource();
            setAuth((prev) => ({
                password_enabled: true,
                password_set: prev?.password_set ?? true,
                authenticated: false,
            }));
        });

        return () => {
            cancelled = true;
            offUnauthorized();
        };
    }, []);

    useEffect(() => {
        if (!auth?.authenticated) return;
        startEventSource();
        return stopEventSource;
    }, [auth?.authenticated]);

    const handleLoginSuccess = () => {
        // 登录后重新加载，让自定义前端能够被服务端返回
        window.location.reload();
    };

    const handleLogout = async () => {
        try {
            await logoutAPI();
        } catch (e) {
            console.error('登出失败:', e);
        }
        stopEventSource();
        setAuth((prev) => ({
            password_enabled: true,
            password_set: prev?.password_set ?? true,
            authenticated: false,
        }));
    };

    const qrFgColor = React.useMemo(() => {
        if (theme === 'dark') return '#f6f6f6';
        if (theme === 'light') return '#213547';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? '#f6f6f6' : '#213547';
    }, [theme]);

    const cycleTheme = () => {
        const next = {system: 'light', light: 'dark', dark: 'system'};
        const newTheme = next[theme] || 'system';
        setTheme(newTheme);
        try {
            localStorage.setItem(THEME_KEY, newTheme);
        } catch (e) {
            console.error('保存主题设置失败:', e);
        }
    };

    const themeLabel = {system: t('web.themeLabel.system'), light: t('web.themeLabel.light'), dark: t('web.themeLabel.dark')};

    if (auth === null) {
        return <AppStyle/>;
    }

    if (auth.password_enabled && !auth.authenticated) {
        return <Login onSuccess={handleLoginSuccess}/>;
    }

    return (
        <DialogProvider>
            <ToastProvider>
                <AppStyle>
                    <SseStatusBanner/>
                    <PortChangedBanner/>
                    <main>
                        <div className="topLeftBar">
                            <SideNav route={route} onNavigate={navigate} footer={(
                                <>
                                    <button
                                        className="theme-toggle-btn"
                                        onClick={cycleTheme}
                                        title={t('web.themeTitle')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                                             style={{display: theme === 'dark' ? 'none' : 'block'}}>
                                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                                        </svg>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                                             style={{display: theme === 'dark' ? 'block' : 'none'}}>
                                            <circle cx="12" cy="12" r="5"/>
                                            <line x1="12" y1="1" x2="12" y2="3"/>
                                            <line x1="12" y1="21" x2="12" y2="23"/>
                                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                                            <line x1="1" y1="12" x2="3" y2="12"/>
                                            <line x1="21" y1="12" x2="23" y2="12"/>
                                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                                        </svg>
                                        <span style={{fontSize: '0.78rem', marginLeft: '4px'}}>{themeLabel[theme]}</span>
                                    </button>
                                    <select
                                        className="lang-selector"
                                        defaultValue={i18n.language}
                                        onChange={(e) => changeLanguage(e.target.value)}
                                    >
                                        <option value="zh-CN">{t('web.languageLabel.zh-CN')}</option>
                                        <option value="en">{t('web.languageLabel.en')}</option>
                                    </select>
                                    {auth.password_enabled && (
                                        <button className="theme-toggle-btn" onClick={handleLogout}>
                                            {t('web.auth.logout')}
                                        </button>
                                    )}
                                </>
                            )}/>
                            <QrCodeButton fgColor={qrFgColor}/>
                        </div>
                        <h1 className="appTitle">LAN Share</h1>
                        <p className="appSubtitle">{t('web.subtitle')}</p>
                    </main>

                    <div className="content">
                        {route === ROUTE_FILES ? (
                            <div className="fileRow">
                                <FileSharing/>
                            </div>
                        ) : (
                            <div className="textRow">
                                <TextSharing/>
                            </div>
                        )}
                    </div>
                </AppStyle>
            </ToastProvider>
        </DialogProvider>
    );
}

export default App;
