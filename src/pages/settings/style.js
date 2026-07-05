import styled from "@emotion/styled";

const SettingsStyle = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 24px;
    max-width: 720px;

    .page-header h1 {
        font-size: 32px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--on-surface);
    }

    .section-card {
        background: var(--surface-container-lowest);
        border: 1px solid var(--outline-variant);
        border-radius: var(--radius-md);
        overflow: hidden;
        box-shadow: var(--shadow-sm);
    }

    .section-card:hover {
        border-color: color-mix(in srgb, var(--outline-variant) 60%, transparent);
    }

    .section-header {
        padding: 20px 24px;
        background: var(--surface-container-low);
        border-bottom: 1px solid var(--outline-variant);
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

    .section-header h2 {
        font-size: 20px;
        font-weight: 600;
        color: var(--on-surface);
    }

    .section-header p {
        font-size: 14px;
        color: var(--on-surface-variant);
        margin: 8px 0 0;
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

    .option-label h3 {
        font-size: 14px;
        font-weight: 500;
        color: var(--on-surface);
    }

    .option-label p {
        font-size: 13px;
        color: var(--on-surface-variant);
    }

    .port-value {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: var(--surface-container);
        border: 1px solid var(--outline-variant);
        border-radius: var(--radius);
        color: var(--primary);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color var(--dur-fast) var(--ease);
    }

    .port-value:hover {
        background: var(--surface-container-high);
    }

    .directory-row {
        display: flex;
        gap: 0;
    }

    .directory-input {
        flex: 1;
        padding: 10px 14px;
        background: var(--surface-container-low);
        border: 1px solid var(--outline-variant);
        border-right: none;
        border-radius: var(--radius) 0 0 var(--radius);
        color: var(--on-surface);
        font-size: 13px;
        font-weight: 500;
        outline: none;
        cursor: pointer;
    }

    .directory-browse {
        padding: 10px 16px;
        background: var(--primary);
        color: var(--on-primary);
        border: 1px solid var(--primary);
        border-radius: 0 var(--radius) var(--radius) 0;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color var(--dur-fast) var(--ease);
    }

    .directory-browse:hover {
        background: color-mix(in srgb, var(--primary) 90%, transparent);
    }

    select.theme-select {
        padding: 8px 32px 8px 12px;
        background: var(--surface-container);
        border: 1px solid var(--outline-variant);
        border-radius: var(--radius);
        color: var(--on-surface);
        font-size: 14px;
        font-weight: 500;
        outline: none;
        cursor: pointer;
        min-width: 140px;
        appearance: auto;
        -webkit-appearance: auto;
        -moz-appearance: auto;
    }

    select.theme-select:hover {
        background: var(--surface-container-high);
    }

    select.theme-select:focus {
        border-color: var(--primary);
        box-shadow: var(--shadow-glow);
    }
`;

export default SettingsStyle;
