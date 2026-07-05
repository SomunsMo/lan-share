import styled from "@emotion/styled";

const SettingsStyle = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 24px;
    max-width: 720px;

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
`;

export default SettingsStyle;
