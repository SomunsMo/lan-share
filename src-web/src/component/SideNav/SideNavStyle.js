import styled from "@emotion/styled";

// 展开/收起动画时长，需与 index.jsx 中卸载延时保持一致
export const SIDENAV_ANIMATION_MS = 200;

const SideNavStyle = styled.div`
    display: contents;

    .sideNavTrigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        padding: 0;
        color: var(--text-secondary);
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 20px;
        cursor: pointer;
    }

    .sideNavTrigger:hover {
        border-color: var(--accent);
        color: var(--text-primary);
    }

    .sideNavMask {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 10400;
        background: rgba(0, 0, 0, 0.35);
        opacity: 0;
        transition: opacity ${SIDENAV_ANIMATION_MS} ease;
    }

    .sideNavMask.open {
        opacity: 1;
    }

    .sideNavPanel {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        z-index: 10401;
        display: flex;
        flex-direction: column;
        width: 240px;
        background: var(--bg-card);
        border-right: 1px solid var(--border);
        box-shadow: var(--shadow-md);
        transform: translateX(-100%);
        transition: transform ${SIDENAV_ANIMATION_MS} ease;
    }

    .sideNavPanel.open {
        transform: translateX(0);
    }

    .sideNavHeader {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        height: 56px;
        padding: 0 16px;
        border-bottom: 1px solid var(--border);
    }

    .sideNavTitle {
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--text-primary);
    }

    .sideNavClose {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        padding: 0;
        color: var(--text-secondary);
        background: transparent;
        border: none;
        border-radius: var(--radius);
        cursor: pointer;
    }

    .sideNavClose:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
    }

    /* 占满标题与底部设置之间的空白，点击空白处即可关闭 */
    .sideNavList {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 4px;
        padding: 12px;
        overflow-y: auto;
    }

    .sideNavItem {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 12px;
        font-size: 0.9rem;
        font-weight: 500;
        text-align: left;
        white-space: nowrap;
        color: var(--text-secondary);
        background: transparent;
        border: none;
        border-radius: var(--radius);
        cursor: pointer;
    }

    .sideNavItem:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
    }

    .sideNavItem.active {
        color: var(--accent);
        background: var(--bg-hover);
    }

    .sideNavItem svg {
        flex-shrink: 0;
    }

    .sideNavFooter {
        display: flex;
        flex-shrink: 0;
        flex-direction: column;
        gap: 8px;
        margin-top: auto;
        padding: 12px;
        border-top: 1px solid var(--border);
    }

    .sideNavFooter .theme-toggle-btn,
    .sideNavFooter .lang-selector {
        width: 100%;
        justify-content: center;
        min-width: 0;
    }

    /* 移动端：菜单全屏展开 */
    @media (max-width: 767px) {
        .sideNavPanel {
            width: 100%;
            border-right: none;
        }
    }
`;

export default SideNavStyle;