import { resolveReducedMotion } from "./motion.js";

/*
 * 点击回弹：所有可点击的元素按下时缩一下、松开后弹回原大小。
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
const POP_MS = 300;
const activeAnimations = new WeakMap();
// 记录被临时改成 inline-block 的行内元素，动画结束时还原
const inlineElements = new WeakMap();

function isDisabled(el) {
    return el.disabled === true || el.getAttribute("aria-disabled") === "true";
}

// 滑块是拖拽控件，按下不代表「点一下」，不参与回弹
function isInSlider(el) {
    return typeof el.closest === "function" && !!el.closest(".MuiSlider-root");
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

function pop(el) {
    const previous = activeAnimations.get(el);
    if (previous) previous.cancel();

    // 短边缩 2px，限制在 2%–6%：小按钮有手感，整行也不会缩得太夸张
    const rect = el.getBoundingClientRect();
    const shortSide = Math.min(rect.width, rect.height) || 1;
    const shrink = Math.min(0.06, Math.max(0.02, 2 / shortSide));

    // 行内元素（如关于页的链接）默认忽略 scale，动画期间临时转成行内块。
    // 单行文字的 inline-block 基线与 inline 一致，不会引起排版跳动。
    if (getComputedStyle(el).display === "inline") {
        inlineElements.set(el, true);
        el.style.display = "inline-block";
    }

    const animation = el.animate([
        { scale: "1", easing: "cubic-bezier(0.4, 0, 1, 1)", offset: 0 },
        { scale: String(1 - shrink), easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", offset: 0.35 },
        { scale: "1", offset: 1 },
    ], { duration: POP_MS });

    activeAnimations.set(el, animation);
    animation.finished.catch(() => {}).finally(() => {
        // 连点时旧的动画会被新动画顶掉，只有最新那次负责收尾
        if (activeAnimations.get(el) !== animation) return;
        activeAnimations.delete(el);
        if (inlineElements.delete(el)) el.style.display = "";
    });
}

export function installClickPop() {
    if (typeof window === "undefined" || window.__clickPopInstalled) return;
    window.__clickPopInstalled = true;

    document.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || event.isPrimary === false) return;
        if (resolveReducedMotion()) return;
        const el = findClickable(event.target);
        if (el) pop(el);
    }, true);
}
