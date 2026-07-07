import React, { useState, useEffect } from 'react';
import AboutStyle from "./style.js";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from '@tauri-apps/plugin-opener';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import {useToast} from "@/components/toast/index.jsx";

function About() {
    const { t } = useTranslation();
    const {showToast} = useToast();
    const [appVersion, setAppVersion] = useState('');
    const [checking, setChecking] = useState(false);
    const [updateResult, setUpdateResult] = useState(null);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);

    useEffect(() => {
        invoke('get_app_version').then(setAppVersion).catch(() => setAppVersion(''));
    }, []);

    const handleCheckUpdate = async () => {
        setChecking(true);
        try {
            const result = await invoke('check_update');
            if (result.error) {
                showToast({message: t('about.update.error', {error: result.error}), type: 'error'});
                return;
            }
            if (result.has_update) {
                setUpdateResult(result);
                setShowUpdateDialog(true);
            } else {
                showToast({message: t('about.update.upToDate'), type: 'success'});
            }
        } catch (e) {
            showToast({message: t('about.update.error', {error: e}), type: 'error'});
        } finally {
            setChecking(false);
        }
    };

    const handleDownload = () => {
        if (updateResult?.download_url) {
            openUrl(updateResult.download_url);
        }
        setShowUpdateDialog(false);
    };

    return (
        <AboutStyle>
            <div className="hero">
                <div className="hero-icon">
                    <img src="/icon.png" alt="LAN Share"/>
                </div>
                <Typography variant="h4" fontSize="3rem" fontWeight={700} sx={{ color: 'var(--on-surface)' }} className="hero-title">{t('about.title')}</Typography>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }} className="hero-version">{appVersion}</Typography>
                <Button variant="outlined" size="small" disabled={checking} onClick={handleCheckUpdate} startIcon={
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                }>
                    {checking ? t('about.update.checking') : t('about.checkUpdates')}
                </Button>
            </div>

            <div className="bento-grid">
                <div className="info-card">
                    <div className="info-card-header">
                        <svg viewBox="0 0 24 24"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
                        <Typography variant="subtitle1" fontSize="1rem" fontWeight={600} sx={{ color: 'var(--on-surface)' }}>{t('about.openSource.title')}</Typography>
                    </div>
                    <div className="info-row">
                        <span className="info-value"><a href="https://github.com/SomunsMo/lan-share" target="_blank" rel="noopener noreferrer">github.com/SomunsMo/lan-share</a></span>
                    </div>
                </div>

                <div className="info-card">
                    <div className="info-card-header">
                        <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        <Typography variant="subtitle1" fontSize="1rem" fontWeight={600} sx={{ color: 'var(--on-surface)' }}>{t('about.license.title')}</Typography>
                    </div>
                    <div className="info-row">
                        <div className="license-large" onClick={() => openUrl('https://opensource.org/licenses/MIT')}>
                            {t('about.license.name')}
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={showUpdateDialog} onClose={() => setShowUpdateDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('about.update.title')}</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                        {t('about.update.newVersion', { version: updateResult?.latest_version })}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'var(--on-surface-variant)' }}>
                        {updateResult?.release_notes || t('about.update.noReleaseNotes')}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowUpdateDialog(false)}>{t('about.update.later')}</Button>
                    <Button variant="contained" onClick={handleDownload}>{t('about.update.download')}</Button>
                </DialogActions>
            </Dialog>
        </AboutStyle>
    );
}

export default About;
