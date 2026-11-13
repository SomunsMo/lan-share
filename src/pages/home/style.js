import styled from "@emotion/styled";

const HomeStyle = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;

    .dual-panel {
        display: flex;
        flex: 1;
        align-items: center;
        justify-content: center;
        gap: 48px;
    }

    @media (max-width: 768px) {
        .dual-panel {
            flex-direction: column;
            gap: 32px;
        }
    }

    .qr-panel {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 24px;
        /* 加载态、二维码、服务不可用三种状态高度不同，先占住空间避免切换时整块跳动 */
        min-height: 320px;
    }

    .qr-panel > * {
        animation: fade-up var(--dur-slow) var(--ease-enter) backwards;
    }

    /* 状态切换时只做淡入，不再叠加位移，避免和高度变化一起抖 */
    .qr-panel > .qr-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
        width: 100%;
        animation: fade-in var(--dur-mid) var(--ease-standard);
    }

    /* vt-nav 会关闭页内入场动画；状态切换的淡入仍保留，避免加载完成后硬切 */
    html.vt-nav & .qr-panel > .qr-state {
        animation: fade-in var(--dur-mid) var(--ease-standard);
    }

    .qr-panel > *:nth-of-type(2) {
        animation-delay: 40ms;
    }

    .details-panel {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .details-panel.details-ready > * {
        animation: fade-up var(--dur-mid) var(--ease-enter) backwards;
    }

    .details-panel.details-ready > *:nth-of-type(2) {
        animation-delay: 40ms;
    }

    .placeholder-panel {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 48px 0;
    }

    .placeholder-icon {
        width: 64px;
        height: 64px;
        color: var(--on-surface-variant);
        opacity: 0.5;
    }

    .placeholder-icon svg {
        width: 100%;
        height: 100%;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
    }
`;

export default HomeStyle;
