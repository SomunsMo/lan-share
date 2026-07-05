import React, {useEffect, useState} from 'react';
import HomeStyle from "./style.js";
import {invoke} from "@tauri-apps/api/core";
import {QRCodeSVG} from "qrcode.react";
import {open} from '@tauri-apps/plugin-dialog';
import {useDialog} from "@/components/dialog/index.jsx";
import {useTranslation} from "react-i18next";
import copy from 'copy-to-clipboard';

function Home() {
    const { t } = useTranslation();
    const [webUrl, setWebUrl] = useState("");
    const [serverStatus, setServerStatus] = useState(null); // null=loading, {running, port, reason}
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

    // 查询HTTP服务器运行状态
    const fetchServerStatus = async () => {
        const status = await invoke("get_server_status");
        const ip = await invoke("get_local_ip");
        setServerStatus(status);
        if (status.running) {
            setWebUrl(`http://${ip}:${status.port}/web`);
        } else {
            setWebUrl(`http://${ip}:${status.port}/web`);
        }
    }

    const [deviceName, setDeviceName] = useState("");
    useEffect(() => {
        invoke("get_device_name").then(name => setDeviceName(name)).catch(() => {});
    }, []);

    const copyUrl = () => {
        const addr = webUrl ? webUrl.replace('http://', '') : '';
        copy(addr);
    }

    const ipAddr = webUrl ? webUrl.split('/')[2].split(':')[0] : '';
    const portNum = webUrl ? webUrl.split('/')[2].split(':')[1] : '';

    const statusText = serverStatus?.running
        ? t('home.listening') || 'Listening...'
        : t('home.notRunning') || 'Not Running';

    return (
        <HomeStyle>
            <div className="dual-panel">
                <div className="qr-panel">
                    {serverStatus?.running ? (
                        <>
                            <div className="qr-card">
                                <QRCodeSVG className={"qrcode"} value={webUrl} fgColor={qrFgColor} bgColor={"transparent"}/>
                            </div>
                            <div className="qr-label">
                                <h2>{t('home.scanTips')}</h2>
                            </div>
                        </>
                    ) : (
                        <div className="placeholder-panel">
                            <div className="placeholder-icon">
                                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            </div>
                            <p className="placeholder-text">{t('home.serviceUnavailable') || 'Service Unavailable'}</p>
                        </div>
                    )}
                </div>

                <div className="details-panel">
                    <div className="details-section">
                        <h3>{t('home.detailsTitle') || 'Local Device Details'}</h3>
                        <div className="detail-row">
                            <span className="detail-label">{t('home.deviceName') || 'Device Name'}</span>
                            <span className="detail-value">{deviceName}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">{t('home.localIp') || 'Local IP'}</span>
                            <span className="detail-value code">{ipAddr}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">{t('home.port') || 'Port'}</span>
                            <span className="detail-value code">{portNum}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">{t('home.status') || 'Status'}</span>
                            <div className="status-row">
                                <div className={"status-dot" + (serverStatus?.running ? "" : " status-dot--stopped")} />
                                <span className={"status-label" + (serverStatus?.running ? "" : " status-label--stopped")}>
                                    {statusText}
                                </span>
                            </div>
                        </div>
                        {!serverStatus?.running && serverStatus?.reason === 'port_occupied' && (
                            <div className="detail-row detail-row--reason">
                                <span className="detail-label">{t('home.reasonTitle') || 'Reason'}</span>
                                <span className="detail-value">{t('home.reasonPortOccupied', { port: portNum })}</span>
                            </div>
                        )}
                    </div>

                    {serverStatus?.running && (
                        <div className="manual-card">
                            <p className="manual-desc">{t('home.manualDesc')}</p>
                            <div className="url-block" onClick={copyUrl} title={t('home.copyTooltip')}>
                                <code>{webUrl ? webUrl.replace('http://', '') : ''}</code>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </HomeStyle>
    );
}

export default Home;
