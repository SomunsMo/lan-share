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

    .qr-card {
        background: var(--surface-container-lowest);
        border: 1px solid var(--outline-variant);
        border-radius: var(--radius-md);
        padding: 24px;
        box-shadow: var(--shadow-sm);
    }

    .qr-card svg {
        display: block;
    }

    .qr-label {
        text-align: center;
    }

    .qr-label h2 {
        font-size: 24px;
        font-weight: 600;
        color: var(--on-surface);
    }

    .qr-label p {
        font-size: 16px;
        color: var(--on-surface-variant);
        margin-top: 4px;
    }

    .details-panel {
        display: flex;
        flex-direction: column;
        gap: 32px;
        min-width: 320px;
    }

    .details-section h3 {
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--on-surface-variant);
        margin-bottom: 16px;
    }

    .detail-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--outline-variant);
    }

    .detail-row:last-of-type {
        border-bottom: none;
    }

    .detail-row--reason .detail-value {
        color: var(--error);
        word-break: break-word;
        white-space: normal;
        text-align: right;
        max-width: 200px;
    }

    .detail-label {
        font-size: 16px;
        color: var(--on-surface-variant);
    }

    .detail-value {
        font-size: 16px;
        font-weight: 600;
        color: var(--on-surface);
    }

    .detail-value.code {
        font-size: 14px;
        font-weight: 500;
        background: var(--surface-container);
        padding: 4px 8px;
        border-radius: var(--radius);
    }

    .status-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 6px #22c55e;
    }

    .status-dot--stopped {
        background: var(--error);
    }

    .status-label {
        font-size: 16px;
        color: var(--on-surface);
    }

    .status-label--stopped {
        color: var(--error);
    }



    .manual-card {
        background: var(--surface-container-low);
        border: 1px solid var(--outline-variant);
        border-radius: var(--radius-md);
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .manual-desc {
        font-size: 16px;
        color: var(--on-surface);
        margin: 0;
        line-height: 1.2;
    }

    .url-block {
        background: var(--surface-container-lowest);
        border: 1px solid var(--outline-variant);
        border-radius: var(--radius);
        padding: 16px;
        cursor: pointer;
    }

    .url-block code {
        font-size: 18px;
        font-weight: 700;
        color: var(--primary);
        user-select: all;
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

    .placeholder-text {
        font-size: 16px;
        color: var(--on-surface-variant);
        text-align: center;
    }
`;

export default HomeStyle;
