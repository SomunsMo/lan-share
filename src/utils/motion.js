import { invoke } from "@tauri-apps/api/core";

/**
 * 动效偏好：统一决定「是否减弱动画」。
 *
 * system  跟随系统（默认）：读 prefers-reduced-motion
 * full    完整动画：忽略系统的减弱动效设置
 * reduced 减弱动画：始终使用降级动效
 *
 * 结果只写一次到 <html data-motion="full|reduced">，CSS 与导航过渡都读它，
 * 避免 JS 判断和媒体查询各算一套导致两边不一致。
 */
export const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

let preference = "system";
const mql = typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia(MOTION_QUERY)
    : null;
let systemReduced = !!mql?.matches;

function applyMotion() {
    document.documentElement.dataset.motion = resolveReducedMotion() ? "reduced" : "full";
}

/** 当前是否应该使用减弱动效 */
export function resolveReducedMotion() {
    if (preference === "full") return false;
    if (preference === "reduced") return true;
    return systemReduced;
}

/** 当前保存的偏好值：system | full | reduced */
export function getMotionPreference() {
    return preference;
}

/** 系统本身是否开启了减弱动效（设置页提示用） */
export function isSystemReducedMotion() {
    return systemReduced;
}

/** 切换偏好并立即生效（不落库，落库由调用方负责） */
export function setMotionPreference(value) {
    preference = value;
    applyMotion();
}

// 模块加载即写一次：首屏渲染前就按系统偏好决定，避免先播一遍完整动画再被降级
applyMotion();

/**
 * 启动时初始化：监听系统偏好变化，并读取用户保存的设置。
 * 设置读取失败时保持「跟随系统」，不影响界面可用性。
 */
export async function initMotion() {
    if (mql) {
        mql.addEventListener("change", (event) => {
            systemReduced = event.matches;
            // 只有「跟随系统」时才需要跟着变，显式选择的值不受系统影响
            applyMotion();
        });
    }

    try {
        const saved = await invoke("get_motion_setting");
        if (saved === "system" || saved === "full" || saved === "reduced") {
            preference = saved;
        }
    } catch (e) {
        console.warn("读取动效设置失败:", e);
    }

    applyMotion();
    return preference;
}
