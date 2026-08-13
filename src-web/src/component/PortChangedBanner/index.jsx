import React, {useEffect, useRef, useState} from 'react';
import styled from "@emotion/styled";
import {subscribe} from "../../service/sse.js";
import {whenIdle} from "../../service/taskManager.js";
import {useDialog} from "@/component/Dialog/useDialog.js";
import {useToast} from "@/component/Toast/useToast.js";
import {useTranslation} from "react-i18next";

// 端口热切换提示条：桌面应用修改端口成功后，顶部常驻提示，点击可前往新地址。
// 跳转会等 Web 端所有上传任务执行完毕后再进行，避免中断传输。
const Banner = styled.div`
    position: sticky;
    top: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 36px;
    padding: 6px 16px;
    background: var(--bg-toast-warning);
    border-bottom: 1px solid var(--border-toast-warning);
    color: var(--toast-warning);
    font-size: 13px;
    font-weight: 500;
    text-align: center;
    box-sizing: border-box;
`;

const GoBtn = styled.button`
    padding: 3px 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-toast-warning);
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--toast-warning);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    transition: border-color 0.15s;

    &:hover {
        border-color: var(--toast-warning);
    }
`;

function buildNewUrl(port) {
    const url = new URL(window.location.href);
    url.port = String(port);
    return url.href;
}

export default function PortChangedBanner() {
    const { t } = useTranslation();
    const {showDialog} = useDialog();
    const {showToast} = useToast();
    const [info, setInfo] = useState(null);
    // 用户已要求跳转（点击提示条或对话框确认），此时不再弹出对话框
    const jumpPendingRef = useRef(false);
    // 对话框弹过后不再重复弹出
    const notifiedRef = useRef(false);

    useEffect(() => {
        const unsubscribe = subscribe((evt) => {
            if (!evt || evt.type !== 'port_changed' || !evt.port) return;

            const currentPort = window.location.port;
            // 服务端口改回当前页面所在端口：无需跳转，去掉提示条，仅告知用户已恢复
            if (String(evt.port) === currentPort) {
                jumpPendingRef.current = false;
                setInfo(null);
                showDialog({
                    title: t('web.portChange.restoredTitle'),
                    content: t('web.portChange.restoredContent'),
                    buttons: [{label: t('web.portChange.acknowledge'), value: true, primary: true}],
                });
                return;
            }

            const oldPort = currentPort;
            setInfo({oldPort, newPort: evt.port});
            jumpPendingRef.current = false;
            notifiedRef.current = false;

            // 等所有上传任务执行完毕后弹出对话框（无任务立即弹）
            whenIdle(() => {
                if (jumpPendingRef.current || notifiedRef.current) return;
                notifiedRef.current = true;
                showDialog({
                    title: t('web.portChange.dialogTitle'),
                    content: (
                        <div>
                            <p>{t('web.portChange.dialogContent', {oldPort, newPort: evt.port})}</p>
                            <p style={{wordBreak: 'break-all'}}><b>{buildNewUrl(evt.port)}</b></p>
                        </div>
                    ),
                    buttons: [
                        {label: t('web.portChange.stay'), value: false},
                        {label: t('web.portChange.goNow'), value: true, primary: true},
                    ],
                }).then((confirmed) => {
                    if (confirmed) {
                        jumpPendingRef.current = true;
                        window.location.replace(buildNewUrl(evt.port));
                    }
                });
            });
        });
        return unsubscribe;
    }, [showDialog, t]);

    if (!info) return null;

    const handleBannerClick = () => {
        if (jumpPendingRef.current) return;
        jumpPendingRef.current = true;
        showToast({message: t('web.portChange.waiting'), type: 'info'});
        whenIdle(() => window.location.replace(buildNewUrl(info.newPort)));
    };

    return (
        <Banner>
            <span>{t('web.portChange.banner')}</span>
            <GoBtn onClick={handleBannerClick}>{t('web.portChange.bannerGo')}</GoBtn>
        </Banner>
    );
}