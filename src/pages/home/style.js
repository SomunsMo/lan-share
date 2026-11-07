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
        gap: 24px;
    }

    .qr-panel > * {
        animation: fade-up var(--dur-slow) var(--ease-enter) backwards;
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
