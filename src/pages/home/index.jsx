import React, {useEffect, useMemo, useState} from 'react';
import HomeStyle from "./style.js";
import {invoke} from "@tauri-apps/api/core";
import {QRCodeSVG} from "qrcode.react";
import {open} from '@tauri-apps/plugin-dialog';
import {useDialog} from "@/components/dialog/index.jsx";
import {useTranslation} from "react-i18next";
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import {useToast} from "@/components/toast/index.jsx";
import {copyText} from "../../utils/copyText.js";
import CircularProgress from '@mui/material/CircularProgress';

function Home() {
    const { t } = useTranslation();
    const {showToast} = useToast();
    const [webUrl, setWebUrl] = useState("");
    const [serverStatus, setServerStatus] = useState(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [qrFgColor, setQrFgColor] = useState("#213547");
    const {showDialog} = useDialog();

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

    const fetchServerStatus = async () => {
        try {
            const status = await invoke("get_server_status");
            const ip = await invoke("get_local_ip");
            setServerStatus(status);
            setWebUrl(`http://${ip}:${status.port}/web`);
        } catch (err) {
            console.error("获取服务器状态失败：", err);
        } finally {
            setStatusLoading(false);
        }
    }

    const [deviceName, setDeviceName] = useState("");
    useEffect(() => {
        invoke("get_device_name").then(name => setDeviceName(name)).catch(() => {});
    }, []);

    const copyUrl = async () => {
        const addr = webUrl ? webUrl.replace('http://', '') : '';
        try {
            await copyText(addr);
            showToast({message: t('common.toast.copied'), type: 'success'});
        } catch (err) {
            console.error('复制失败:', err);
        }
    }

    const ipAddr = useMemo(() => webUrl ? webUrl.split('/')[2].split(':')[0] : '', [webUrl]);
    const portNum = useMemo(() => webUrl ? webUrl.split('/')[2].split(':')[1] : '', [webUrl]);

    return (
        <HomeStyle>
            <div className="dual-panel">
                <div className="qr-panel">
                    {statusLoading ? (
                        <div className="placeholder-panel">
                            <CircularProgress size={56} thickness={4} sx={{ color: 'var(--primary)' }} />
                            <Typography variant="body1" color="var(--on-surface-variant)" sx={{ textAlign: 'center' }}>
                                {t('common.loading') || 'Loading...'}
                            </Typography>
                        </div>
                    ) : serverStatus?.running ? (
                        <>
                            <Paper elevation={1} sx={{ p: '24px', bgcolor: 'var(--surface-container-lowest)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', width: 'fit-content', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <QRCodeSVG value={webUrl} fgColor={qrFgColor} bgColor={"transparent"} size={180} />
                            </Paper>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography
                                    sx={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--on-surface)', fontFamily: 'var(--font-family-heading)' }}
                                >
                                    {t('home.scanTips')}
                                </Typography>
                                <Typography
                                    sx={{ fontSize: '1rem', color: 'var(--on-surface-variant)', mt: 0.5, whiteSpace: 'pre-line' }}
                                >
                                    {t('home.scanTipsDesc')}
                                </Typography>
                            </Box>
                        </>
                    ) : (
                        <div className="placeholder-panel">
                            <div className="placeholder-icon">
                                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            </div>
                            <Typography variant="body1" color="var(--on-surface-variant)" sx={{ textAlign: 'center' }}>
                                {t('home.serviceUnavailable') || 'Service Unavailable'}
                            </Typography>
                        </div>
                    )}
                </div>

                <div className="details-panel">
                    <div>
                        <Typography
                            sx={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--secondary)', fontFamily: 'var(--font-family-label)', mb: 2 }}
                        >
                            {t('home.detailsTitle') || 'Local Device Details'}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid var(--border)' }}>
                            <Typography sx={{ fontSize: '1rem', color: 'var(--on-surface-variant)' }}>{t('home.deviceName') || 'Device Name'}</Typography>
                            <Typography
                                title={t('home.copyTooltip')}
                                onClick={async () => { try { await copyText(deviceName); showToast({message: t('common.toast.copied'), type: 'success'}); } catch (err) { console.error('复制失败:', err); } }}
                                sx={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--on-surface)', cursor: 'pointer', '&:hover': { color: 'var(--primary)' } }}
                            >{deviceName}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid var(--border)' }}>
                            <Typography sx={{ fontSize: '1rem', color: 'var(--on-surface-variant)' }}>{t('home.localIp') || 'Local IP'}</Typography>
                            <Box component="code" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--on-surface)', bgcolor: 'var(--surface-container)', px: 1, py: 0.5, borderRadius: 'var(--radius)', fontFamily: 'var(--font-family-label)' }}>
                                {ipAddr}
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid var(--border)' }}>
                            <Typography sx={{ fontSize: '1rem', color: 'var(--on-surface-variant)' }}>{t('home.port') || 'Port'}</Typography>
                            <Box component="code" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--on-surface)', bgcolor: 'var(--surface-container)', px: 1, py: 0.5, borderRadius: 'var(--radius)', fontFamily: 'var(--font-family-label)' }}>
                                {portNum}
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                            <Typography sx={{ fontSize: '1rem', color: 'var(--on-surface-variant)' }}>{t('home.status') || 'Status'}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: serverStatus?.running ? '#22c55e' : 'var(--error)', boxShadow: serverStatus?.running ? '0 0 6px #22c55e' : 'none' }} />
                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: serverStatus?.running ? 'var(--on-surface)' : 'var(--error)', fontFamily: 'var(--font-family-label)' }}>
                                    {serverStatus?.running ? (t('home.listening') || 'Listening...') : (t('home.notRunning') || 'Not Running')}
                                </Typography>
                            </Box>
                        </Box>
                        {!serverStatus?.running && serverStatus?.reason === 'port_occupied' && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                                <Typography sx={{ fontSize: '1rem', color: 'var(--on-surface-variant)' }}>{t('home.reasonTitle') || 'Reason'}</Typography>
                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--error)', fontFamily: 'var(--font-family-label)', wordBreak: 'break-word', textAlign: 'right', maxWidth: 200 }}>
                                    {t('home.reasonPortOccupied', { port: portNum })}
                                </Typography>
                            </Box>
                        )}
                    </div>

                    {serverStatus?.running && (
                        <Paper elevation={0} sx={{ p: 3, bgcolor: 'var(--surface-container-low)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Typography
                                sx={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--secondary)', fontFamily: 'var(--font-family-label)' }}
                            >
                                {t('home.manualTitle')}
                            </Typography>
                            <Typography sx={{ fontSize: '1rem', color: 'var(--on-surface-variant)' }}>
                                {t('home.manualDesc')}
                            </Typography>
                            <Box onClick={copyUrl} title={t('home.copyTooltip')} sx={{ cursor: 'pointer', textAlign: 'center', color: 'var(--on-surface-variant)', '&:hover': { color: 'var(--primary)' } }}>
                                <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: 'var(--font-family-heading)' }}>
                                    {webUrl ? webUrl.replace('http://', '') : ''}
                                </Typography>
                            </Box>
                        </Paper>
                    )}
                </div>
            </div>
        </HomeStyle>
    );
}

export default Home;
