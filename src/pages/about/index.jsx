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
                <Typography variant="h4" fontSize="2rem" fontWeight={700} className="hero-title">{t('about.title')}</Typography>
                <Typography variant="body2" fontSize="0.75rem" color="var(--on-surface-variant)" className="hero-version">{t('about.version')}</Typography>
            </div>

            <div className="bento-grid">
                <div className="info-card">
                    <div className="info-card-header">
                        <svg viewBox="0 0 24 24"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
                        <Typography variant="subtitle1" fontSize="1.125rem" fontWeight={600}>{t('about.openSource.title')}</Typography>
                    </div>
                    <div className="info-row">
                        <span className="info-label">{t('about.openSource.repository')}</span>
                        <span className="info-value"><a href="https://github.com/SomunsMo/lan-share" target="_blank" rel="noopener noreferrer">github.com/SomunsMo/lan-share</a></span>
                    </div>
                </div>

                <div className="info-card">
                    <div className="info-card-header">
                        <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        <Typography variant="subtitle1" fontSize="1.125rem" fontWeight={600}>{t('about.license.title')}</Typography>
                    </div>
                    <div className="info-row">
                        <Typography variant="body2" fontSize="0.75rem" color="var(--on-surface-variant)" className="info-label">{t('about.license.title')}</Typography>
                        <div className="license-badge" onClick={() => openUrl('https://opensource.org/licenses/MIT')}>
                            <svg viewBox="0 0 24 24" width="14" height="14" className="license-svg"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            MIT License
                        </div>
                    </div>
                    <div className="info-row">
                        <Typography variant="body2" fontSize="0.75rem" color="var(--on-surface-variant)" className="info-label">{t('about.tech.title')}</Typography>
                        <div className="tech-tags">
                            <span className="tech-tag">Rust</span>
                            <span className="tech-tag">Tauri</span>
                            <span className="tech-tag">Vite</span>
                            <span className="tech-tag">React</span>
                            <span className="tech-tag">SQLite</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="cta-area">
                <Button variant="outlined" startIcon={
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                }>
                    {t('about.checkUpdates')}
                </Button>
            </div>
        </AboutStyle>
    );
}

export default About;
