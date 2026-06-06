import React, {useEffect, useState} from 'react';
import HomeStyle from "./style.js";
import {invoke} from "@tauri-apps/api/core";
import {QRCodeSVG} from "qrcode.react";
import {open} from '@tauri-apps/plugin-dialog';
import {useDialog} from "@/components/dialog/index.jsx";
import {useTranslation} from "react-i18next";

function Home() {
    const { t } = useTranslation();
    const [webUrl, setWebUrl] = useState("");
    const [portOccupied, setPortOccupied] = useState(null); // null=loading, number=被占用的端口号, false=正常
    const [qrFgColor, setQrFgColor] = useState("#213547");
    const {showDialog} = useDialog();

    // 监听主题变化，更新二维码配色
    useEffect(() => {
        const updateColor = () => {
            const html = document.documentElement;
            if (html.classList.contains('dark')) setQrFgColor('#f6f6f6');
            else if (html.classList.contains('light')) setQrFgColor('#213547');
            else setQrFgColor(window.matchMedia('(prefers-color-scheme: dark)').matches ? '#f6f6f6' : '#213547');
        };
        updateColor();
        const observer = new MutationObserver(updateColor);
        observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        fetchServerStatus().catch(e => {
            console.error("获取服务器状态失败：", e);
        });

        checkFirstRun().catch(e => {
            console.error("首次运行检查失败：", e);
        });
    }, []);

    // 检测首次运行，引导用户设置共享目录
    const checkFirstRun = async () => {
        const configured = await invoke("is_sharing_root_configured");
        if (configured) return;

        const confirmed = await showDialog({
            title: t('home.firstRun.title'),
            content: t('home.firstRun.content'),
            buttons: [
                {label: t('home.firstRun.buttonLater'), value: false},
                {label: t('home.firstRun.buttonNow'), value: true, primary: true},
            ],
        });

        if (!confirmed) return;

        const selectedPath = await open({
            directory: true,
            multiple: false,
            title: '选择共享根目录',
        });

        if (selectedPath) {
            try {
                await invoke('set_sharing_directory', {directoryPath: selectedPath});
            } catch (error) {
                console.error('保存共享目录失败:', error);
            }
        }
    };

    // 主动查询HTTP服务器运行状态
    const fetchServerStatus = async () => {
        try {
            const port = await invoke("get_server_status");
            const ip = await invoke("get_local_ip");
            setWebUrl(`http://${ip}:${port}/web`);
            setPortOccupied(false);
        } catch (occupiedPort) {
            setPortOccupied(occupiedPort);
            console.warn("HTTP服务器端口被占用:", occupiedPort);
        }
    }

    return (
        <HomeStyle>
            <div className={"banner"}>
                <h1 className={"title"}>LAN Share</h1>
                <p className={"subtitle"}>{t('home.subtitle')}</p>

                {portOccupied === false ? (
                    <div className={"codeArea"}>
                        <p className={"scanTips"}>{t('home.scanTips')}</p>
                        <QRCodeSVG className={"qrcode"} value={webUrl} fgColor={qrFgColor} bgColor={"transparent"}/>
                        <p className={"urlTips"}>{t('home.orVisit')}</p>
                        <p className={"qrcodeUrl"}>{webUrl}</p>
                    </div>
                ) : portOccupied != null ? (
                    <div className={"portWarning"}>
                        <div className={"warningIcon"}>&#9888;</div>
                        <h3 className={"warningTitle"}>{t('home.portWarning.title')}</h3>
                        <p className={"warningDesc"}>{t('home.portWarning.desc', { port: portOccupied })}</p>
                        <div className={"warningSteps"}>
                            <p>{t('home.portWarning.stepTitle')}</p>
                            <ol>
                                <li>{t('home.portWarning.step1')}</li>
                                <li>{t('home.portWarning.step2')}</li>
                            </ol>
                        </div>
                    </div>
                ) : null}
            </div>
        </HomeStyle>
    );
}

export default Home;
