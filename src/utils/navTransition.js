import { useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { flushSync } from "react-dom";
import { routes } from "@/pages/_router-map.jsx";

// 侧边栏标签的展示顺序，决定页面切换动画的方向。
// navTransition 与 _router-map 之间是循环引用：home 页会用到 useAppNavigate，
// 而路由表又导入了 home。因此不能在模块顶层读取 routes（会命中 TDZ），
// 改为首次导航时再计算。
let navOrder = null;
function getNavOrder() {
    if (!navOrder) {
        navOrder = routes
            .filter(route => route.navPosition)
            .map(route => route.path);
    }
    return navOrder;
}

// "/" 是首页别名，按 /home 参与排序
const HOME_ALIASES = { "/": "/home" };

// 连续快速切换时，只有最后一次过渡负责清理方向标记
let transitionSeq = 0;
// 正在进行的过渡：新的跳转先把它跳过，让切换立即响应而不是等动画播完
let activeTransition = null;

function getNavIndex(pathname) {
    return getNavOrder().indexOf(HOME_ALIASES[pathname] || pathname);
}

/**
 * "up"   切到更靠上的标签：新页从上方落入，旧页向下淡出
 * "down" 切到更靠下的标签：新页从下方升起，旧页向上淡出
 * null   同页或不在导航顺序里，不做方向动画
 */
export function getNavDirection(fromPathname, toPathname) {
    const from = getNavIndex(fromPathname);
    const to = getNavIndex(toPathname);
    if (from < 0 || to < 0 || from === to) return null;
    return to < from ? "up" : "down";
}

// 过渡 API 运行期抛错后置位：之后一律退回 CSS 入场动画，避免每次切页都失败一次
let vtBroken = false;

export function supportsViewTransition() {
    return !vtBroken
        && typeof document !== "undefined"
        && typeof document.startViewTransition === "function";
}

/**
 * 带方向的路由跳转。浏览器支持 View Transitions 时，旧页与新页会按标签顺序
 * 一上一下地交叉过渡；否则退化为普通跳转（由 CSS 入场动画兜底）。
 */
export function useAppNavigate() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    // 用 ref 保存当前路径，保持返回的跳转函数引用稳定，
    // 避免依赖它的副作用（如托盘事件监听）在每次切页时重新订阅
    const pathnameRef = useRef(pathname);
    pathnameRef.current = pathname;

    return useCallback((to, options = {}) => {
        const direction = getNavDirection(pathnameRef.current, to);
        const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        // 窗口不可见时 startViewTransition 的回调会被挂起，导致跳转被延后
        const isVisible = document.visibilityState === "visible";

        if (!direction || prefersReducedMotion || !isVisible || !supportsViewTransition()) {
            if (activeTransition) {
                activeTransition.skipTransition();
                activeTransition = null;
            }
            navigate(to, options);
            return;
        }

        const root = document.documentElement;
        const seq = ++transitionSeq;
        root.dataset.navDir = direction;
        // 页面切换交给过渡 API 后，页内的入场动画会和快照对不上（过渡结束时元素“归位”跳动），
        // 因此首次方向切换后就不再播放页内入场动画，由整页过渡承担运动感
        root.classList.add("vt-nav");

        // 上一次过渡还没播完就再次切页：让它立即结束，接着播新方向的过渡
        if (activeTransition) {
            try {
                activeTransition.skipTransition();
            } catch (e) {
                // 忽略：过渡可能已经结束
            }
            activeTransition = null;
        }

        try {
            const transition = document.startViewTransition(() => {
                // 必须同步提交路由更新：过渡 API 在回调返回后立刻拍新快照。
                // 这依赖 main.jsx 中 BrowserRouter 的 unstable_useTransitions={false}，
                // 否则路由更新会被 startTransition 延后，快照拍到的是旧页面。
                flushSync(() => navigate(to, options));
            });
            activeTransition = transition;

            transition.finished.catch(() => {}).finally(() => {
                if (activeTransition === transition) activeTransition = null;
                if (seq === transitionSeq) delete root.dataset.navDir;
            });
        } catch (e) {
            // 过渡失败（如已有同名过渡在跑）不能影响导航本身。
            // 同时标记过渡不可用并撤掉 vt-ready / vt-nav：否则 CSS 兜底动画已被关掉，
            // 界面会变成完全没有动效（Windows 上表现为“页面切换没动画”）。
            vtBroken = true;
            delete root.dataset.navDir;
            root.classList.remove("vt-nav", "vt-ready");
            navigate(to, options);
        }
    }, [navigate]);
}
