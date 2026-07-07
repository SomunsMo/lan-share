import React from 'react';
import AboutStyle from "./style.js";
import {useTranslation} from "react-i18next";
import {openUrl} from '@tauri-apps/plugin-opener';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

function About() {
    const { t } = useTranslation();

    return (
        <AboutStyle>
            <div className="hero">
                <div className="hero-icon">
                    <img src="/icon.png" alt="LAN Share"/>
                </div>
                <Typography variant="h4" fontSize="3rem" fontWeight={700} sx={{ color: 'var(--on-surface)' }} className="hero-title">{t('about.title')}</Typography>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }} className="hero-version">{t('about.version')}</Typography>
                <Button variant="outlined" size="small" startIcon={
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                }>
                    {t('about.checkUpdates')}
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

        </AboutStyle>
    );
}

export default About;
