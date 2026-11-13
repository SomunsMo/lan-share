import { resolveReducedMotion } from "./motion.js";

/*
 * 点击反馈：按下时缩一下并保持，松开后弹回原大小。
 *
 * 只在完整动效模式下生效，减弱动效时直接不播。
 * 用 Web Animations API 单独动画 CSS 的 scale 属性，而不是写 animation 类：
 * - 不碰 animation 属性，不会打断或重播元素自身的入场动画（历史列表行有 row-enter）；
 * - 不和 transform 冲突，hover 位移、侧边栏滑块等照常工作。
 */

// 语义上可点击的元素：原生标签 + MUI 的可交互根节点
const CLICKABLE_SELECTOR = [
    "a[href]",
    "button",
    "[role='button']",
    "[role='tab']",
    "[role='menuitem']",
    "[role='option']",
    "[role='switch']",
    "[role='checkbox']",
    "[role='radio']",
    "[role='combobox']",
    ".MuiButtonBase-root",
    ".MuiSwitch-root",
    ".MuiChip-root",
].join(",");

// 自定义可点击区域（如首页可复制的 IP 行）只能靠 cursor: pointer 识别
const MAX_DEPTH = 8;
// 按下收缩
const PRESS_MS = 90;
// 松开回弹
const RELEASE_MS = 320;
// 弹窗按钮：点击后弹窗很快淡出，回弹要更短、更早到位
const DIALOG_RELEASE_MS = 180;
// 弹窗按钮的关闭最多等这么久（从 pointerdown 起算），让按下反馈露出来
const PRESS_FEEDBACK_MS = 160;

// 每个元素当前正在播的动画，连按时用来取消旧动画
const activeAnimations = new WeakMap();
// 记录被临时改成 inline-block 的行内元素，动画结束时还原
const inlineElements = new WeakMap();
// 当前被按住、还没松开的元素
let pressed = null;
// 最近一次按下的时间，用于计算弹窗关闭还需要等多久
let lastPressAt = -Infinity;

function isDisabled(el) {
    return el.disabled === true || el.getAttribute("aria-disabled") === "true";
}

// 滑块是拖拽控件，按下不代表「点一下」，不参与回弹
function isInSlider(el) {
    return typeof el.closest === "function" && !!el.closest(".MuiSlider-root");
}

function isInDialog(el) {
    return typeof el.closest === "function" && !!el.closest(".MuiDialog-root");
}

/** 先找语义化的可点击容器，找不到再用 cursor: pointer 兜底 */
function findClickable(start) {
    let node = start;
    for (let depth = 0; node && node !== document.body && depth < MAX_DEPTH; depth += 1) {
        if (node.nodeType === 1) {
            if (isInSlider(node)) return null;
            if (node.matches(CLICKABLE_SELECTOR)) return isDisabled(node) ? null : node;
        }
        node = node.parentElement;
    }

    // cursor 会继承，所以要取「连续 pointer 链」里最外层那个元素，
    // 否则点到文字时只会缩内层 span，而不是整块可点击区域
    let found = null;
    node = start;
    for (let depth = 0; node && node !== document.body && depth < MAX_DEPTH; depth += 1) {
        if (node.nodeType === 1) {
            if (isInSlider(node)) return null;
            if (getComputedStyle(node).cursor === "pointer") found = node;
            else if (found) break;
        }
        node = node.parentElement;
    }
    return found && !isDisabled(found) ? found : null;
}

/** 读取当前视觉上的 scale；没有动画时返回 "1" */
function readScale(el) {
    const value = getComputedStyle(el).scale;
    return !value || value === "none" ? "1" : value;
}

/** 短边缩 3px 太小的小按钮会明显放大，大块元素仍按 2px 收缩 */
function shrinkFor(el) {
    const rect = el.getBoundingClientRect();
    const shortSide = Math.min(rect.width, rect.height) || 1;
    const target = shortSide < 48 ? 3 : 2;
    return Math.min(0.09, Math.max(0.02, target / shortSide));
}

function press(el) {
    // 上一次还没松开（多指针或连按）先收尾
    if (pressed) release();

    const from = readScale(el);
    const previous = activeAnimations.get(el);
    if (previous) previous.cancel();

    // 行内元素（如关于页的链接）默认忽略 scale，按住期间临时转成行内块。
    // 单行文字的 inline-block 基线与 inline 一致，不会引起排版跳动。
    if (getComputedStyle(el).display === "inline") {
        inlineElements.set(el, true);
        el.style.display = "inline-block";
    }

    const animation = el.animate([
        { scale: from },
        { scale: String(1 - shrinkFor(el)) },
    ], { duration: PRESS_MS, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "forwards" });

    activeAnimations.set(el, animation);
    pressed = { el, animation };
    lastPressAt = performance.now();
}

function release() {
    if (!pressed) return;
    const { el, animation } = pressed;
    pressed = null;

    // 先读当前 scale 再取消，回弹才能从按到一半的位置接着走，不会跳回原大小
    const from = readScale(el);
    animation.cancel();

    const rebound = el.animate([
        { scale: from },
        { scale: "1" },
    ], {
        duration: isInDialog(el) ? DIALOG_RELEASE_MS : RELEASE_MS,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    });

    activeAnimations.set(el, rebound);
    rebound.finished.catch(() => {}).finally(() => {
        // 连按时旧的动画会被新动画顶掉，只有最新那次负责收尾
        if (activeAnimations.get(el) !== rebound) return;
        activeAnimations.delete(el);
        if (inlineElements.delete(el)) el.style.display = "";
    });
}

/**
 * 弹窗按钮点击后会立即关闭并淡出，按下反馈会被淡出整个盖住。
 * 把关闭动作推迟到按下反馈大致可见之后；减弱动效或最近没有按下反馈时立即执行。
 */
export function afterPressFeedback(run) {
    if (resolveReducedMotion()) {
        run();
        return;
    }
    const wait = PRESS_FEEDBACK_MS - (performance.now() - lastPressAt);
    if (wait <= 0) run();
    else setTimeout(run, wait);
}

export function installClickPop() {
    if (typeof window === "undefined" || window.__clickPopInstalled) return;
    window.__clickPopInstalled = true;

    document.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || event.isPrimary === false) return;
        if (resolveReducedMotion()) return;
        const el = findClickable(event.target);
        if (el) press(el);
    }, true);

    // 松手、指针取消、窗口失焦都要收尾，避免元素一直保持缩小状态
    document.addEventListener("pointerup", release, true);
    document.addEventListener("pointercancel", release, true);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) release();
    });
}
