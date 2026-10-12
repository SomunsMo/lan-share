import React, {useEffect, useState} from 'react';
import {useTranslation} from "react-i18next";
import SideNavStyle, {SIDENAV_ANIMATION_MS} from "./SideNavStyle.js";
import {ROUTE_TEXT, ROUTE_FILES} from "@/util/route.js";

const MenuIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
);

const TextIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
    </svg>
);

const FileIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
);

const MENU_ITEMS = [
    {route: ROUTE_TEXT, labelKey: 'nav.textSharing', icon: TextIcon},
    {route: ROUTE_FILES, labelKey: 'nav.fileSharing', icon: FileIcon},
];

// 左侧导航：宽屏为左侧面板 + 右侧遮罩，移动端全屏展开
export default function SideNav({route, onNavigate, footer}) {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);
    // 关闭动画播完再卸载
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (open) {
            setMounted(true);
            return;
        }
        if (!mounted) return;
        const timer = setTimeout(() => setMounted(false), SIDENAV_ANIMATION_MS);
        return () => clearTimeout(timer);
    }, [open, mounted]);

    // 切换页面后自动收起
    useEffect(() => {
        setOpen(false);
    }, [route]);

    // 展开时锁定背景滚动，Esc 关闭
    useEffect(() => {
        if (!open) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <SideNavStyle>
            <button className="sideNavTrigger" onClick={() => setOpen(true)} title={t('nav.openMenu')}
                    aria-label={t('nav.openMenu')}>
                <MenuIcon/>
            </button>

            {mounted && (
                <>
                    <div className={`sideNavMask${open ? ' open' : ''}`} onClick={() => setOpen(false)}/>
                    <nav className={`sideNavPanel${open ? ' open' : ''}`} aria-label={t('nav.title')}>
                        <div className="sideNavHeader">
                            <span className="sideNavTitle">{t('nav.title')}</span>
                            <button className="sideNavClose" onClick={() => setOpen(false)}
                                    title={t('nav.closeMenu')} aria-label={t('nav.closeMenu')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                        <div className="sideNavList" onClick={() => setOpen(false)}>
                            {MENU_ITEMS.map(item => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.route}
                                        className={`sideNavItem${route === item.route ? ' active' : ''}`}
                                        aria-current={route === item.route ? 'page' : undefined}
                                        onClick={() => {
                                            setOpen(false);
                                            onNavigate(item.route);
                                        }}
                                    >
                                        <Icon/>
                                        <span>{t(item.labelKey)}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {footer && <div className="sideNavFooter">{footer}</div>}
                    </nav>
                </>
            )}
        </SideNavStyle>
    );
}