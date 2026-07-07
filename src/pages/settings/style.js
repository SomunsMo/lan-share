import styled from "@emotion/styled";

const SettingsStyle = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 24px;
    max-width: 720px;

    .section-card {
        background: var(--surface-container-lowest);
        border: var(--glass-border);
        border-radius: var(--radius-md);
        overflow: hidden;
        box-shadow: var(--shadow-sm);
    }

    .section-card:hover {
        border-color: var(--primary);
    }

    .section-header {
        padding: 15px 24px;
        background: var(--surface-container-low);
        border-bottom: var(--glass-border);
    }

    .section-header-top {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .section-header svg {
        width: 20px;
        height: 20px;
        fill: none;
        stroke: var(--primary);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .section-body {
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .option-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
    }

    .option-label {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .directory-row {
        display: flex;
        gap: 0;
    }

    .hue-picker {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 140px;
    }

    .color-swatch-wrap {
        position: relative;
        width: 36px;
        height: 36px;
        cursor: pointer;
        flex-shrink: 0;
    }

    .color-swatch {
        display: block;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid var(--outline-variant);
        transition: background var(--dur-fast) var(--ease);
        pointer-events: none;
    }

    .color-input-hidden {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        padding: 0;
        border: none;
    }

    .hue-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--on-surface-variant);
        font-variant-numeric: tabular-nums;
    }
`;

export default SettingsStyle;
