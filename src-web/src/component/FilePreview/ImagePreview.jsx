import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
    ImagePreviewRoot, ImagePreviewImg, ImagePreviewReset, ImagePreviewStatus,
} from './ImagePreviewStyle';

const MIN_SCALE = 0.5;
const MAX_SCALE = 8;
// 每个滚动事件的缩放倍率（指数），不受系统滚动距离影响
const WHEEL_STEP = 0.3;
// 缩放补间时长（CSS transition，由浏览器合成器驱动，丝滑）
const TRANSITION_MS = 300;
// 惯性甩动参数
const SAMPLE_WINDOW_MS = 120;       // 速度采样窗口
const INERTIA_SKIP_SPEED = 0.12;    // 低于此速度（px/ms）不触发惯性
const INERTIA_TAU_MS = 200;         // 速度衰减时间常数（越大甩得越远）
const INERTIA_MIN_SPEED = 0.02;     // 低于此速度停止惯性

function ImagePreview({url, reloadKey}) {
    const {t} = useTranslation();
    const [error, setError] = useState(false);
    const [natural, setNatural] = useState(null);
    const [card, setCard] = useState(null);
    const rootRef = useRef(null);
    const imgRef = useRef(null);
    // 缩放/平移状态（ref，避免每帧触发 React 渲染）
    const state = useRef({scale: 1, x: 0, y: 0});
    const pointers = useRef(new Map());
    const panInfo = useRef(null);
    const pinchInfo = useRef(null);
    const samples = useRef([]);
    const inertiaRef = useRef(null);

    const stopInertia = useCallback(() => {
        if (inertiaRef.current != null) {
            cancelAnimationFrame(inertiaRef.current);
            inertiaRef.current = null;
        }
    }, []);

    const measureCard = useCallback(() => {
        const el = rootRef.current;
        if (el) setCard({w: el.clientWidth, h: el.clientHeight});
    }, []);
    useLayoutEffect(() => {
        measureCard();
        if (!rootRef.current) return;
        const ro = new ResizeObserver(measureCard);
        ro.observe(rootRef.current);
        return () => ro.disconnect();
    }, [measureCard]);

    // 预加载探测图片自然尺寸（DOM 外加载，避免依赖嵌套布局尺寸）
    useEffect(() => {
        const probe = new Image();
        probe.onload = () => setNatural({w: probe.naturalWidth, h: probe.naturalHeight});
        probe.onerror = () => setError(true);
        probe.src = url;
        return () => { probe.onload = null; probe.onerror = null; };
    }, [url, reloadKey]);

    const clampScale = (v) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

    // 应用 transform：instant 无过渡（拖动/捏合/惯性跟手），否则 CSS transition 缓动（滚轮/双击）
    const applyTransform = useCallback((instant) => {
        const img = imgRef.current;
        if (!img) return;
        img.style.transition = instant ? 'none' : `transform ${TRANSITION_MS}ms ease-out`;
        img.style.transform = `translate(${state.current.x}px, ${state.current.y}px) scale(${state.current.scale})`;
    }, []);

    // 缩放并保持锚点 (ax, ay) 不动（滚轮/双击以视口中心，双指捏合以两指中点）
    const zoomAt = useCallback((ax, ay, newScale, instant) => {
        const el = rootRef.current;
        if (!el) return;
        const s = state.current;
        const cw = el.clientWidth;
        const ch = el.clientHeight;
        const centerX = cw / 2 + s.x;
        const centerY = ch / 2 + s.y;
        const lpX = (ax - centerX) / s.scale;
        const lpY = (ay - centerY) / s.scale;
        s.scale = newScale;
        s.x = ax - lpX * newScale - cw / 2;
        s.y = ay - lpY * newScale - ch / 2;
        applyTransform(instant);
    }, [applyTransform]);

    // 由采样点计算松手时的速度（px/ms）
    const computeVelocity = useCallback(() => {
        const list = samples.current;
        if (list.length < 3) return {vx: 0, vy: 0};
        const first = list[0];
        const last = list[list.length - 1];
        const dt = last.t - first.t;
        if (dt <= 0) return {vx: 0, vy: 0};
        return {vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt};
    }, []);

    const handleWheel = useCallback((e) => {
        if (Math.abs(e.deltaY) < 5) return;
        const factor = Math.exp(e.deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP);
        const el = rootRef.current;
        if (!el) return;
        e.preventDefault();
        zoomAt(el.clientWidth / 2, el.clientHeight / 2, clampScale(state.current.scale * factor), false);
    }, [zoomAt]);

    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        el.addEventListener('wheel', handleWheel, {passive: false});
        return () => el.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    // 惯性甩动：松手后速度按指数衰减继续平移
    const startInertia = useCallback(() => {
        stopInertia();
        const {vx, vy} = computeVelocity();
        const speed = Math.hypot(vx, vy);
        if (speed < INERTIA_SKIP_SPEED) return;
        const s = state.current;
        let vxNow = vx;
        let vyNow = vy;
        let lastT = performance.now();
        const loop = (now) => {
            const dt = Math.min(50, now - lastT);
            lastT = now;
            const f = Math.exp(-dt / INERTIA_TAU_MS);
            vxNow *= f;
            vyNow *= f;
            s.x += vxNow * dt;
            s.y += vyNow * dt;
            applyTransform(true);
            if (Math.hypot(vxNow, vyNow) < INERTIA_MIN_SPEED) {
                inertiaRef.current = null;
                return;
            }
            inertiaRef.current = requestAnimationFrame(loop);
        };
        inertiaRef.current = requestAnimationFrame(loop);
    }, [applyTransform, computeVelocity, stopInertia]);

    // 指针交互：单指/左键拖动平移（松手带惯性），双指捏合缩放（以两指中点锚定）
    const handlePointerDown = useCallback((e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        stopInertia();
        samples.current = [];
        const el = rootRef.current;
        if (el) el.setPointerCapture?.(e.pointerId);
        pointers.current.set(e.pointerId, {x: e.clientX, y: e.clientY});
        if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinchInfo.current = {
                dist: Math.hypot(a.x - b.x, a.y - b.y),
                scale: state.current.scale,
                midX: (a.x + b.x) / 2,
                midY: (a.y + b.y) / 2,
            };
            panInfo.current = null;
        } else if (pointers.current.size === 1) {
            panInfo.current = {x: e.clientX, y: e.clientY, ox: state.current.x, oy: state.current.y};
        }
    }, [stopInertia]);

    const handlePointerMove = useCallback((e) => {
        const p = pointers.current.get(e.pointerId);
        if (p) {
            p.x = e.clientX;
            p.y = e.clientY;
        }
        if (pinchInfo.current && pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            const info = pinchInfo.current;
            if (dist > 0 && info.dist > 0) {
                zoomAt(info.midX, info.midY, clampScale(info.scale * (dist / info.dist)), true);
            }
            return;
        }
        if (panInfo.current && pointers.current.size === 1) {
            const s = state.current;
            s.x = panInfo.current.ox + (e.clientX - panInfo.current.x);
            s.y = panInfo.current.oy + (e.clientY - panInfo.current.y);
            applyTransform(true);
            const now = performance.now();
            samples.current.push({t: now, x: e.clientX, y: e.clientY});
            while (samples.current.length && now - samples.current[0].t > SAMPLE_WINDOW_MS) {
                samples.current.shift();
            }
        }
    }, [applyTransform, zoomAt]);

    const handlePointerEnd = useCallback((e) => {
        const wasPan = panInfo.current != null;
        pointers.current.delete(e.pointerId);
        if (pointers.current.size === 1) {
            const [only] = [...pointers.current.values()];
            panInfo.current = {x: only.x, y: only.y, ox: state.current.x, oy: state.current.y};
            samples.current = [];
        } else if (pointers.current.size === 0) {
            panInfo.current = null;
            if (wasPan) startInertia();
            else stopInertia();
        } else {
            panInfo.current = null;
        }
        if (pointers.current.size < 2) pinchInfo.current = null;
    }, [startInertia, stopInertia]);

    const handleDoubleClick = useCallback(() => {
        const el = rootRef.current;
        if (!el) return;
        const target = state.current.scale === 1 ? 2 : 1;
        zoomAt(el.clientWidth / 2, el.clientHeight / 2, target, false);
    }, [zoomAt]);

    const handleReset = useCallback(() => {
        stopInertia();
        state.current = {scale: 1, x: 0, y: 0};
        applyTransform(false);
    }, [applyTransform, stopInertia]);

    // 等比 fit：图片尺寸 = 原尺寸 × min(容器宽/原宽, 容器高/原高)，完整居中展示且不裁剪
    let imgSize = null;
    if (natural && card && card.w > 0 && card.h > 0 && natural.w > 0 && natural.h > 0) {
        const fit = Math.min(card.w / natural.w, card.h / natural.h);
        imgSize = {w: Math.round(natural.w * fit), h: Math.round(natural.h * fit)};
    }

    return (
        <ImagePreviewRoot
            ref={rootRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onDoubleClick={handleDoubleClick}
        >
            {error ? (
                <ImagePreviewStatus>{t('fileSharing.preview.loadFailed')}</ImagePreviewStatus>
            ) : !imgSize ? (
                <ImagePreviewStatus>{t('fileSharing.preview.loading')}</ImagePreviewStatus>
            ) : (
                <>
                    <ImagePreviewReset type="button" onClick={handleReset}>{t('fileSharing.preview.reset')}</ImagePreviewReset>
                    {/* left/top 50% + margin 负半实现静态居中；transform 相对居中位置进行平移缩放 */}
                    <ImagePreviewImg
                        key={reloadKey}
                        ref={imgRef}
                        src={url}
                        alt="preview"
                        style={{width: imgSize.w, height: imgSize.h, marginLeft: -imgSize.w / 2, marginTop: -imgSize.h / 2}}
                        draggable={false}
                    />
                </>
            )}
        </ImagePreviewRoot>
    );
}

export default ImagePreview;