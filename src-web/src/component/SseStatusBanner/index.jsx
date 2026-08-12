import { useState, useEffect, useRef } from 'react';
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { subscribeStatus, retryNow } from "../../service/sse.js";
import { useTranslation } from "react-i18next";

// sticky：文档顶部时随文档流排布（top=0，后方内容顺序下移），向下滚动后吸顶常驻窗口顶部
const BannerWrapper = styled.div`
    position: sticky;
    top: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    height: 36px;
    padding: 0 16px;
    background: var(--bg-toast-warning);
    border-bottom: 1px solid var(--border-toast-warning);
    color: var(--toast-warning);
    font-size: 13px;
    font-weight: 500;
    box-sizing: border-box;
`;

const RetryBtn = styled.button`
    padding: 3px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-toast-warning);
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--toast-warning);
    font-family: inherit;
    font-size: 12px;
    transition: border-color 0.15s;

    &&:hover {
        border-color: var(--toast-warning);
    }
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const Spinner = styled.span`
    width: 12px;
    height: 12px;
    border: 2px solid var(--border-toast-warning);
    border-top-color: var(--toast-warning);
    border-radius: 50%;
    display: inline-block;
    animation: ${spin} 0.8s linear infinite;
    flex-shrink: 0;
    box-sizing: border-box;
`;

export default function SseStatusBanner() {
    const { t } = useTranslation();
    const [status, setStatus] = useState({connected: false, nextAttemptAt: null, connecting: false, retryStopped: false});
    const [, setTick] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        const unsub = subscribeStatus((s) => {
            setStatus(s);
        });
        return () => { unsub(); };
    }, []);

    useEffect(() => {
        if (status.connected || status.connecting || status.nextAttemptAt == null) {
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            return;
        }
        timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
        return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
    }, [status.connected, status.connecting, status.nextAttemptAt]);

    // 初始未连接成功前（nextAttemptAt 为 null 且未停自动重试）不显示
    if (status.connected) return null;
    if (!status.connecting && status.nextAttemptAt == null && !status.retryStopped) return null;

    // 正在连接尝试（倒计时结束触发重连）：隐藏按钮，显示 loading
    if (status.connecting) {
        return (
            <BannerWrapper>
                <Spinner/>
                <span>{t('web.sse.reconnecting')}</span>
            </BannerWrapper>
        );
    }

    // 超过 15 次失败：已停止自动重试，仅显示手动重连按钮
    if (status.retryStopped) {
        return (
            <BannerWrapper>
                <span>{t('web.sse.retryStopped')}</span>
                <RetryBtn onClick={retryNow}>{t('web.sse.retryNow')}</RetryBtn>
            </BannerWrapper>
        );
    }

    const remain = Math.max(0, Math.ceil((status.nextAttemptAt - Date.now()) / 1000));
    return (
        <BannerWrapper>
            <span>{t('web.sse.disconnected', {seconds: remain})}</span>
            <RetryBtn onClick={retryNow}>{t('web.sse.retryNow')}</RetryBtn>
        </BannerWrapper>
    );
}