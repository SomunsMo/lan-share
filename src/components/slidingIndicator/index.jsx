import { useEffect, useLayoutEffect, useRef } from "react";
import { resolveReducedMotion } from "../../utils/motion.js";

/*
 * 侧边栏 / 筛选 tabs 的“液体滑块”。
 *
 * 视觉由三件事共同构成：
 * 1. 四条边各自用弹簧贴近目标：移动方向的前缘很硬、后缘很软，
 *    所以切换时不是整体平移，而是被拖过去、先拉长再收回。
 * 2. 速度越快，垂直方向收得越窄，接近滚动水滴的体积守恒感。
 * 3. 形变量直接由边缘速度驱动：一拖动整块就像液体一样被拉长、变圆，
 *    前缘两角圆到六成，后缘两角圆到十足（更圆），
 *    速度降下来后形变自己退回去。全程没有阶段切换，所以落位不会跳。
 *
 * 文字反色用两层文字：底层正常配色，上层是反色副本，
 * 每帧用 clip-path 裁到滑块当前覆盖的范围，所以颜色是跟着滑块走的。
 */

const LEAD = { omega: 26, zeta: 0.92 };   // 前缘：快、几乎不回弹
const TRAIL = { omega: 15, zeta: 0.8 };   // 后缘：慢、收尾带一点晃动
const MID = { omega: 18, zeta: 0.8 };     // 只换宽度/高度时两条边一致
const DEFORM = { omega: 16, zeta: 1 };    // 液态形变：跟着速度涨、落下后自己退

const STEP = 1 / 240;          // 固定积分步长，不同刷新率手感一致
const POS_EPS = 0.25;          // 静止判定（px）
const VEL_EPS = 1.2;           // 静止判定（px/s）
const EDGE_EPS = 0.5;          // 目标变化判定（px）
const DEFORM_EPS = 0.004;      // 形变量静止判定
const DEFORM_VREF = 900;       // 达到这个速度时形变拉满（px/s）
const SQUEEZE_MAX = 0.08;      // 垂直于运动方向的最大收缩比例
const LEAD_ROUND = 0.65;       // 前缘两角（朝目标方向）圆到几成
const TRAIL_ROUND = 1;         // 后缘两角（来的方向）圆到几成，比前缘更圆
const CLIP_INFLATE = 1;        // 反色裁剪比滑块大 1px，避免边缘漏色
const HIDDEN_CLIP = "inset(100% 0 0 0)";

function parsePx(value) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
}

function findItem(container, key) {
    if (!container || key === null || key === undefined) return null;
    for (const node of container.querySelectorAll("[data-sliding-key]")) {
        if (node.dataset.slidingKey === String(key)) return node;
    }
    return null;
}

function createSpring(value = 0) {
    return { x: value, v: 0 };
}

function stepSpring(spring, target, dt, { omega, zeta }) {
    const k = omega * omega;
    const c = 2 * zeta * omega;
    spring.v += (-k * (spring.x - target) - c * spring.v) * dt;
    spring.x += spring.v * dt;
}

/**
 * 包住任意需要反色的内容（文字、图标）。
 * 内部渲染两份，第二份由滑块几何裁剪后显示。
 */
export function SlidingLabel({ children, className = "", ...rest }) {
    return (
        <span className={className ? `sliding-label ${className}` : "sliding-label"} data-sliding-label {...rest}>
            <span className="sliding-label-base">{children}</span>
            <span className="sliding-label-invert" aria-hidden="true">{children}</span>
        </span>
    );
}

export function useSlidingIndicator({ activeKey, orientation = "horizontal" } = {}) {
    const containerRef = useRef(null);
    const fluidRef = useRef(null);
    const blobRef = useRef(null);

    const springs = useRef({
        left: createSpring(),
        right: createSpring(),
        top: createSpring(),
        bottom: createSpring(),
    });
    const targetRef = useRef(null);
    const paramsRef = useRef({ left: MID, right: MID, top: MID, bottom: MID });
    const motionRef = useRef({ axis: "y", sign: 1 }); // 最近一次移动的主方向
    const deformRef = useRef(createSpring(0));        // 0 = 原形态，1 = 拉长成液滴
    const baseRadiusRef = useRef(8);
    const labelBoxesRef = useRef([]);
    const activeKeyRef = useRef(activeKey);
    const visibleRef = useRef(false);
    const rafRef = useRef(0);
    const lastTsRef = useRef(0);
    const measureRef = useRef(null);

    const applyClips = (rect) => {
        for (const box of labelBoxesRef.current) {
            if (
                rect.right <= box.left || rect.left >= box.left + box.width ||
                rect.bottom <= box.top || rect.top >= box.top + box.height
            ) {
                box.el.style.clipPath = HIDDEN_CLIP;
                continue;
            }
            const top = Math.max(0, rect.top - box.top);
            const right = Math.max(0, box.left + box.width - rect.right);
            const bottom = Math.max(0, box.top + box.height - rect.bottom);
            const left = Math.max(0, rect.left - box.left);
            box.el.style.clipPath = `inset(${top.toFixed(2)}px ${right.toFixed(2)}px ${bottom.toFixed(2)}px ${left.toFixed(2)}px)`;
        }
    };

    const render = () => {
        const blob = blobRef.current;
        const s = springs.current;
        if (!blob || !targetRef.current) return;

        const width = Math.max(0, s.right.x - s.left.x);
        const height = Math.max(0, s.bottom.x - s.top.x);
        const motion = motionRef.current;
        const deform = Math.max(0, Math.min(1, deformRef.current.x));
        const alongX = motion.axis === "x";

        let left = s.left.x;
        let right = s.right.x;
        let top = s.top.x;
        let bottom = s.bottom.x;

        // 形变越大，垂直于运动方向收得越窄：像被拉长的液滴而不是整块木板。
        // 收缩量取自形变弹簧而不是瞬时速度，落位时速度被清零也不会突然弹回原宽度。
        const squeeze = deform * SQUEEZE_MAX;
        if (alongX) {
            const inset = height * squeeze / 2;
            top += inset;
            bottom -= inset;
        } else {
            const inset = width * squeeze / 2;
            left += inset;
            right -= inset;
        }

        // 线速度决定圆角：拖动越快越像一坨液体。
        // 前缘两角（朝目标方向）圆到 LEAD_ROUND，后缘两角圆得更足（TRAIL_ROUND），
        // 两头都是弧面、后头更圆，整体就不会显得像一块带尖角的板子。
        const base = baseRadiusRef.current;
        // 半短边是矩形能圆到且不触发浏览器额外缩放的上限
        const limit = Math.max(base, Math.min(right - left, bottom - top) / 2);
        const leadRadius = base + (limit - base) * deform * LEAD_ROUND;
        const trailRadius = base + (limit - base) * deform * TRAIL_ROUND;

        let tl = base;
        let tr = base;
        let br = base;
        let bl = base;
        if (motion.axis === "y") {
            if (motion.sign >= 0) {
                bl = leadRadius;
                br = leadRadius;
                tl = trailRadius;
                tr = trailRadius;
            } else {
                tl = leadRadius;
                tr = leadRadius;
                bl = trailRadius;
                br = trailRadius;
            }
        } else if (motion.sign >= 0) {
            tr = leadRadius;
            br = leadRadius;
            tl = trailRadius;
            bl = trailRadius;
        } else {
            tl = leadRadius;
            bl = leadRadius;
            tr = trailRadius;
            br = trailRadius;
        }

        blob.style.width = `${Math.max(0, right - left)}px`;
        blob.style.height = `${Math.max(0, bottom - top)}px`;
        blob.style.transform = `translate3d(${left}px, ${top}px, 0)`;
        blob.style.borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;

        // 裁剪用未收缩的矩形：垂直方向那点收缩不影响文字中段
        applyClips({
            left: s.left.x - CLIP_INFLATE,
            top: s.top.x - CLIP_INFLATE,
            right: s.right.x + CLIP_INFLATE,
            bottom: s.bottom.x + CLIP_INFLATE,
        });
    };

    const advance = (dt) => {
        const target = targetRef.current;
        if (!target) return;
        const steps = Math.max(1, Math.ceil(dt / STEP));
        const h = dt / steps;
        const s = springs.current;
        const p = paramsRef.current;
        const deform = deformRef.current;
        for (let i = 0; i < steps; i++) {
            stepSpring(s.left, target.left, h, p.left);
            stepSpring(s.right, target.right, h, p.right);
            stepSpring(s.top, target.top, h, p.top);
            stepSpring(s.bottom, target.bottom, h, p.bottom);
            // 形变没有独立的阶段：目标直接取自当前边缘速度。
            // 速度从 0 连续涨上去再连续落回 0，所以起手和落位都不会跳。
            const speed = Math.max(
                Math.abs(s.left.v),
                Math.abs(s.right.v),
                Math.abs(s.top.v),
                Math.abs(s.bottom.v),
            );
            stepSpring(deform, Math.min(1, speed / DEFORM_VREF), h, DEFORM);
        }
    };

    const settled = () => {
        const target = targetRef.current;
        if (!target) return true;
        const s = springs.current;
        return (
            Math.abs(s.left.x - target.left) < POS_EPS &&
            Math.abs(s.right.x - target.right) < POS_EPS &&
            Math.abs(s.top.x - target.top) < POS_EPS &&
            Math.abs(s.bottom.x - target.bottom) < POS_EPS &&
            Math.abs(s.left.v) < VEL_EPS &&
            Math.abs(s.right.v) < VEL_EPS &&
            Math.abs(s.top.v) < VEL_EPS &&
            Math.abs(s.bottom.v) < VEL_EPS
        );
    };

    // 四边同时落到目标（误差在亚像素内才调用，画面上看不出位移）
    const snapTo = (rect) => {
        const s = springs.current;
        s.left.x = rect.left;
        s.left.v = 0;
        s.right.x = rect.right;
        s.right.v = 0;
        s.top.x = rect.top;
        s.top.v = 0;
        s.bottom.x = rect.bottom;
        s.bottom.v = 0;
    };

    const tick = (ts) => {
        rafRef.current = 0;
        if (!targetRef.current) return;
        const last = lastTsRef.current || ts;
        let dt = (ts - last) / 1000;
        lastTsRef.current = ts;
        if (!(dt > 0)) dt = 1 / 60;
        if (dt > 0.05) dt = 0.05;

        advance(dt);
        const posSettled = settled();
        if (posSettled) snapTo(targetRef.current);
        render();

        const deformSettled =
            Math.abs(deformRef.current.x) < DEFORM_EPS &&
            Math.abs(deformRef.current.v) < DEFORM_EPS * 8;

        if (!posSettled || !deformSettled) {
            rafRef.current = requestAnimationFrame(tick);
        } else {
            deformRef.current.x = 0;
            deformRef.current.v = 0;
            render();
        }
    };

    const start = () => {
        if (rafRef.current) return;
        lastTsRef.current = 0;
        rafRef.current = requestAnimationFrame(tick);
    };

    const measure = () => {
        const container = containerRef.current;
        if (!container) return;

        const keyChanged = activeKeyRef.current !== activeKey;
        activeKeyRef.current = activeKey;

        const item = findItem(container, activeKey);
        if (!item) {
            targetRef.current = null;
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
            visibleRef.current = false;
            if (fluidRef.current) fluidRef.current.style.opacity = "0";
            for (const box of labelBoxesRef.current) box.el.style.clipPath = HIDDEN_CLIP;
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        const styles = getComputedStyle(container);
        // 绝对定位子元素的包含块是容器的 padding box，原点在内边框处，
        // 所以只扣掉 border，padding 由 itemRect 的偏移自然带进来。
        const borderLeft = parsePx(styles.borderLeftWidth);
        const borderTop = parsePx(styles.borderTopWidth);
        // 滑块圆角跟选中项本身一致（侧边栏 12px、筛选 tabs 6px）
        const radius = parsePx(getComputedStyle(item).borderTopLeftRadius);
        if (radius > 0) baseRadiusRef.current = radius;

        const rect = {
            left: itemRect.left - containerRect.left - borderLeft,
            top: itemRect.top - containerRect.top - borderTop,
            right: itemRect.right - containerRect.left - borderLeft,
            bottom: itemRect.bottom - containerRect.top - borderTop,
        };

        // 反色副本的盒子只随布局变化，裁剪时每帧复用
        const boxes = [];
        for (const el of container.querySelectorAll("[data-sliding-label]")) {
            const invert = el.querySelector(".sliding-label-invert");
            if (!invert) continue;
            const r = el.getBoundingClientRect();
            boxes.push({
                el: invert,
                left: r.left - containerRect.left - borderLeft,
                top: r.top - containerRect.top - borderTop,
                width: r.width,
                height: r.height,
            });
        }
        labelBoxesRef.current = boxes;

        const previous = targetRef.current;
        const first = !previous || !visibleRef.current;

        if (keyChanged && previous) {
            const dx = (rect.left + rect.right - previous.left - previous.right) / 2;
            const dy = (rect.top + rect.bottom - previous.top - previous.bottom) / 2;
            // 主方向决定哪两个角是“前缘”：竖着走前缘是上下两角，横着走是左右两角
            if (Math.abs(dy) >= Math.abs(dx)) {
                if (Math.abs(dy) > EDGE_EPS) motionRef.current = { axis: "y", sign: dy > 0 ? 1 : -1 };
            } else if (Math.abs(dx) > EDGE_EPS) {
                motionRef.current = { axis: "x", sign: dx > 0 ? 1 : -1 };
            }
            // 前缘追得快、后缘拖得慢，才有被“拖过去”的形变
            paramsRef.current = {
                left: Math.abs(dx) > EDGE_EPS ? (dx > 0 ? TRAIL : LEAD) : MID,
                right: Math.abs(dx) > EDGE_EPS ? (dx > 0 ? LEAD : TRAIL) : MID,
                top: Math.abs(dy) > EDGE_EPS ? (dy > 0 ? TRAIL : LEAD) : MID,
                bottom: Math.abs(dy) > EDGE_EPS ? (dy > 0 ? LEAD : TRAIL) : MID,
            };
        }

        targetRef.current = rect;
        if (!visibleRef.current) {
            visibleRef.current = true;
            if (fluidRef.current) fluidRef.current.style.opacity = "1";
        }

        // 动画进行中只更新目标与反色盒子，不要打断弹簧
        if (rafRef.current) return;

        if (first || !keyChanged || resolveReducedMotion()) {
            // 首次定位、窗口缩放、减弱动效：直接落位，不播放拖拽。
            // 只有偏差超过半个像素才硬对齐，避免动画结束后一次重渲染把滑块“跳”一下。
            const s = springs.current;
            const farFromTarget = first || [
                ["left", rect.left], ["right", rect.right], ["top", rect.top], ["bottom", rect.bottom],
            ].some(([key, value]) => Math.abs(s[key].x - value) > 0.5);
            deformRef.current.x = 0;
            deformRef.current.v = 0;
            if (farFromTarget) snapTo(rect);
            render();
            return;
        }

        start();
    };

    // 父组件每次渲染后都重新测量（选中态字重、语言、字体都会改变文字宽度）
    useLayoutEffect(() => {
        measureRef.current = measure;
        measure();
    });

    // 尺寸变化不会触发 React 渲染，需要自己重测
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handle = () => measureRef.current?.();
        window.addEventListener("resize", handle);

        let observer = null;
        if (typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver(handle);
            observer.observe(container);
            container.querySelectorAll("[data-sliding-key], [data-sliding-label]").forEach(node => observer.observe(node));
        }
        document.fonts?.ready?.then(handle);

        return () => {
            window.removeEventListener("resize", handle);
            observer?.disconnect();
        };
    }, []);

    useLayoutEffect(() => () => cancelAnimationFrame(rafRef.current), []);

    const indicator = (
        <div className="sliding-fluid" ref={fluidRef} aria-hidden="true">
            <span className="sliding-blob" ref={blobRef} />
        </div>
    );

    return { containerRef, indicator };
}
