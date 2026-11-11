import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button';

// 缩放/平移参数与 web 端 ImagePreview 保持一致
const MIN_SCALE = 0.5;
const MAX_SCALE = 8;
// 每个滚动事件的缩放倍率（指数），不受系统滚动距离影响
const WHEEL_STEP = 0.3;
// 缩放补间时长（CSS transition，由浏览器合成器驱动）
const TRANSITION_MS = 300;
// 惯性甩动参数
const SAMPLE_WINDOW_MS = 120;
const INERTIA_SKIP_SPEED = 0.12;
const INERTIA_TAU_MS = 200;
const INERTIA_MIN_SPEED = 0.02;

// 对话框内图片：初始按对话框内容区可用高度等比缩放。
// zoomable 为 true 时支持滚轮缩放、拖动平移、双指捏合、双击放大/还原、右上角重置，
// 交互逻辑参照 web 端图片预览；为 false 时保持原有静态展示（如粘贴预览）。
export default function DialogImage({ src, alt, borderRadius = '4px', wrapperStyle, zoomable = false }) {
    const { t } = useTranslation();
    const wrapperRef = useRef(null);
    const stageRef = useRef(null);
    const imgRef = useRef(null);
    const [maxH, setMaxH] = useState(0);
    const maxHRef = useRef(0);
    // 图片自然尺寸与舞台可视尺寸
    const [natural, setNatural] = useState(null);
    const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
    // 缩放/平移状态（ref，避免每帧触发 React 渲染）
    const state = useRef({ scale: 1, x: 0, y: 0 });
    // 初始等比缩放系数（1 = 原始尺寸），随舞台尺寸变化
    const fitRef = useRef(1);
    const pointers = useRef(new Map());
    const panInfo = useRef(null);
    const pinchInfo = useRef(null);
    const samples = useRef([]);
    const inertiaRef = useRef(null);

    // 计算对话框内容区可用高度（沿用原有逻辑）
    useLayoutEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        const content = wrapper.closest('.MuiDialogContent-root');
        if (!content) return;

        const compute = () => {
            const paper = content.closest('.MuiDialog-paper') || content.parentElement;
            // paper 最大高度（MUI 默认 calc(100% - 64px)），优先取计算后的像素值
            let paperMaxH = window.innerHeight - 64;
            if (paper) {
                const paperMaxStyle = getComputedStyle(paper).maxHeight;
                if (paperMaxStyle && paperMaxStyle.endsWith('px')) {
                    paperMaxH = parseFloat(paperMaxStyle);
                }
            }
            // 标题区与按钮区高度
            const titleEl = paper && paper.querySelector('.MuiDialogTitle-root');
            const actionsEl = paper && paper.querySelector('.MuiDialogActions-root');
            const titleH = titleEl ? titleEl.getBoundingClientRect().height : 0;
            const actionsH = actionsEl ? actionsEl.getBoundingClientRect().height : 0;
            // content 内容区最大可用高度
            const cs = getComputedStyle(content);
            const paddingTop = parseFloat(cs.paddingTop) || 0;
            const paddingBottom = parseFloat(cs.paddingBottom) || 0;
            const contentMaxH = paperMaxH - titleH - actionsH;
            // 图片上方内容高度
            const contentRect = content.getBoundingClientRect();
            const wrapperRect = wrapper.getBoundingClientRect();
            const above = Math.max(0, wrapperRect.top - contentRect.top - paddingTop);
            // 图片下方同级兄弟高度（如粘贴预览的文件名输入框）
            let topChild = wrapper;
            while (topChild.parentElement && topChild.parentElement !== content) {
                topChild = topChild.parentElement;
            }
            let following = 0;
            let sib = topChild.nextElementSibling;
            while (sib) {
                following += sib.getBoundingClientRect().height;
                sib = sib.nextElementSibling;
            }
            const available = contentMaxH - paddingTop - paddingBottom - above - following;
            if (available > 0 && Math.abs(available - maxHRef.current) > 1) {
                maxHRef.current = available;
                setMaxH(available);
            }
        };

        compute();
        const ro = new ResizeObserver(compute);
        ro.observe(content);
        window.addEventListener('resize', compute);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', compute);
        };
    }, [src]);

    // 探测图片自然尺寸（DOM 外加载，避免依赖嵌套布局尺寸）
    useEffect(() => {
        if (!zoomable) return;
        setNatural(null);
        state.current = { scale: 1, x: 0, y: 0 };
        const probe = new Image();
        probe.onload = () => setNatural({ w: probe.naturalWidth, h: probe.naturalHeight });
        probe.onerror = () => setNatural(null);
        probe.src = src;
        return () => {
            probe.onload = null;
            probe.onerror = null;
        };
    }, [src, zoomable]);

    // 舞台尺寸采样（用于初始 fit 与锚点缩放）
    useLayoutEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const measure = () => {
            const w = stage.clientWidth;
            const h = stage.clientHeight;
            setStageSize(prev => (prev.w === w && prev.h === h ? prev : { w, h }));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(stage);
        return () => ro.disconnect();
    }, [maxH]);

    const stopInertia = useCallback(() => {
        if (inertiaRef.current != null) {
            cancelAnimationFrame(inertiaRef.current);
            inertiaRef.current = null;
        }
    }, []);

    const clampScale = (v) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

    // 应用 transform：instant 无过渡（拖动/捏合/惯性跟手），否则 CSS transition 缓动
    // 图片按原始尺寸布局，缩放并入 transform，保证放大后使用原始像素而非低分辨率位图
    const applyTransform = useCallback((instant) => {
        const img = imgRef.current;
        if (!img) return;
        img.style.transition = instant ? 'none' : `transform ${TRANSITION_MS}ms ease-out`;
        img.style.transform = `translate(${state.current.x}px, ${state.current.y}px) scale(${state.current.scale * fitRef.current})`;
    }, []);

    // 缩放并保持锚点 (ax, ay) 不动（滚轮/双击以视口中心，双指捏合以两指中点）
    const zoomAt = useCallback((ax, ay, newScale, instant) => {
        const stage = stageRef.current;
        if (!stage) return;
        const s = state.current;
        const cw = stage.clientWidth;
        const ch = stage.clientHeight;
        const fit = fitRef.current;
        const effective = s.scale * fit;
        const centerX = cw / 2 + s.x;
        const centerY = ch / 2 + s.y;
        const lpX = (ax - centerX) / effective;
        const lpY = (ay - centerY) / effective;
        s.scale = newScale;
        s.x = ax - lpX * newScale * fit - cw / 2;
        s.y = ay - lpY * newScale * fit - ch / 2;
        applyTransform(instant);
    }, [applyTransform]);

    // 由采样点计算松手时的速度（px/ms）
    const computeVelocity = useCallback(() => {
        const list = samples.current;
        if (list.length < 3) return { vx: 0, vy: 0 };
        const first = list[0];
        const last = list[list.length - 1];
        const dt = last.t - first.t;
        if (dt <= 0) return { vx: 0, vy: 0 };
        return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
    }, []);

    const handleWheel = useCallback((e) => {
        if (Math.abs(e.deltaY) < 5) return;
        const factor = Math.exp(e.deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP);
        const stage = stageRef.current;
        if (!stage) return;
        e.preventDefault();
        zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, clampScale(state.current.scale * factor), false);
    }, [zoomAt]);

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        stage.addEventListener('wheel', handleWheel, { passive: false });
        return () => stage.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    // 惯性甩动：松手后速度按指数衰减继续平移
    const startInertia = useCallback(() => {
        stopInertia();
        const { vx, vy } = computeVelocity();
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
        // 不拦截重置按钮等交互元素的拖动（避免指针捕获导致 click 丢失）
        if (e.target?.closest?.('button')) return;
        stopInertia();
        samples.current = [];
        const stage = stageRef.current;
        if (stage) stage.setPointerCapture?.(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
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
            panInfo.current = { x: e.clientX, y: e.clientY, ox: state.current.x, oy: state.current.y };
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
            samples.current.push({ t: now, x: e.clientX, y: e.clientY });
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
            panInfo.current = { x: only.x, y: only.y, ox: state.current.x, oy: state.current.y };
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

    const handleDoubleClick = useCallback((e) => {
        if (e.target?.closest?.('button')) return;
        const stage = stageRef.current;
        if (!stage) return;
        // 已缩放/平移时双击还原到初始居中状态，避免只复位倍率而位置仍偏移
        if (state.current.scale !== 1) {
            stopInertia();
            state.current = { scale: 1, x: 0, y: 0 };
            applyTransform(false);
            return;
        }
        zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 2, false);
    }, [applyTransform, stopInertia, zoomAt]);

    const handleReset = useCallback(() => {
        stopInertia();
        state.current = { scale: 1, x: 0, y: 0 };
        applyTransform(false);
    }, [applyTransform, stopInertia]);

    // 等比 fit：小图保持原尺寸不放大，大图缩小至舞台内完整展示
    const hasNatural = !!(natural && stageSize.w > 0 && stageSize.h > 0 && natural.w > 0 && natural.h > 0);
    const fit = hasNatural ? Math.min(1, stageSize.w / natural.w, stageSize.h / natural.h) : 1;
    fitRef.current = fit;

    // fit 变化（首次加载/窗口尺寸变化）时同步应用 transform
    useLayoutEffect(() => {
        if (!zoomable || !hasNatural) return;
        applyTransform(true);
    }, [fit, hasNatural, zoomable, applyTransform]);

    // 静态展示：保持原有"按可用高度等比缩小、小图不放大"的表现
    if (!zoomable) {
        return (
            <div ref={wrapperRef} style={{ textAlign: 'center', minHeight: 0, ...(wrapperStyle || {}) }}>
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    style={{ maxWidth: '100%', maxHeight: maxH > 0 ? maxH + 'px' : '60vh', objectFit: 'contain', borderRadius, verticalAlign: 'middle' }}
                />
            </div>
        );
    }

    return (
        <div ref={wrapperRef} style={{ textAlign: 'center', minHeight: 0, ...(wrapperStyle || {}) }}>
            <div
                ref={stageRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onDoubleClick={handleDoubleClick}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: maxH > 0 ? maxH : '60vh',
                    overflow: 'hidden',
                    borderRadius,
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    cursor: 'grab',
                }}
            >
                {hasNatural && (
                    <>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleReset}
                            // 阻止指针事件冒泡到舞台，确保单击即可触发重置（不触发拖动/指针捕获）
                            onPointerDown={(e) => e.stopPropagation()}
                            sx={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                zIndex: 10,
                                // 恢复为缩放前的小尺寸按钮
                                minWidth: 0,
                                px: '10px',
                                py: '4px',
                                fontSize: 12,
                                lineHeight: 1.5,
                                // 半透明底色，保证按钮在图片上方清晰可辨
                                backgroundColor: 'color-mix(in srgb, var(--surface-container-high) 85%, transparent)',
                                '&:hover': {
                                    backgroundColor: 'color-mix(in srgb, var(--surface-container-highest) 92%, transparent)',
                                },
                            }}
                        >
                            {t('imageSharing.previewReset')}
                        </Button>
                        {/* left/top 50% + margin 负半实现静态居中；transform 相对居中位置进行平移缩放 */}
                        <img
                            ref={imgRef}
                            src={src}
                            alt={alt}
                            draggable={false}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: natural.w,
                                height: natural.h,
                                marginLeft: -natural.w / 2,
                                marginTop: -natural.h / 2,
                                objectFit: 'contain',
                                borderRadius,
                                transformOrigin: 'center',
                                userSelect: 'none',
                                WebkitUserDrag: 'none',
                                pointerEvents: 'none',
                                willChange: 'transform',
                            }}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
