import styled from "@emotion/styled";

const HistoryStyle = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    gap: 24px;

    .page-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .page-header h1 {
        font-size: 32px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--on-surface);
        margin: 0;
    }

    .page-header p {
        font-size: 18px;
        color: var(--on-surface-variant);
        margin: 0;
    }

    .header-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
    }

    .filter-tabs {
        display: inline-flex;
        background: var(--surface-container-low);
        border-radius: var(--radius);
        padding: 4px;
        gap: 2px;
    }

    .filter-tab {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: var(--on-surface-variant);
        background: transparent;
        transition: all var(--dur-fast) var(--ease);
        white-space: nowrap;
    }

    .filter-tab:hover {
        color: var(--on-surface);
    }

    .filter-tab.active {
        background: var(--surface);
        color: var(--primary);
        box-shadow: var(--shadow-sm);
    }

    .clear-actions {
        display: flex;
        gap: 8px;
    }

    .clear-btn {
        padding: 6px 14px;
        font-size: 12px;
        background: transparent;
        color: var(--error);
        border: 1px solid var(--outline-variant);
        border-radius: var(--radius);
        cursor: pointer;
        transition: all var(--dur-fast) var(--ease);
    }

    .clear-btn:hover {
        background: var(--error-container);
        border-color: var(--error);
    }

    .list-container {
        background: var(--surface-container-lowest);
        border: 1px solid var(--outline-variant);
        border-radius: var(--radius-md);
        overflow: hidden;
        box-shadow: var(--shadow-sm);
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    .list-header {
        display: grid;
        grid-template-columns: 48px 1fr 80px 100px 140px;
        gap: 16px;
        align-items: center;
        padding: 12px 20px;
        background: var(--surface-container-low);
        border-bottom: 1px solid var(--outline-variant);
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--on-surface-variant);
    }

    .list-body {
        flex: 1;
        overflow-y: auto;
    }

    .list-row {
        display: grid;
        grid-template-columns: 48px 1fr 80px 100px 140px;
        gap: 16px;
        align-items: center;
        padding: 14px 20px;
        border-bottom: 1px solid var(--outline-variant);
        cursor: pointer;
        transition: background-color var(--dur-fast) var(--ease);
    }

    .list-row:last-child {
        border-bottom: none;
    }

    .list-row:hover {
        background: var(--surface-container-low);
    }

    .list-row.row-error {
        background: color-mix(in srgb, var(--error-container) 10%, transparent);
    }

    .list-row.row-error:hover {
        background: color-mix(in srgb, var(--error-container) 18%, transparent);
    }

    .type-icon {
        width: 36px;
        height: 36px;
        border-radius: var(--radius);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .type-icon.file {
        background: var(--surface-container);
        color: var(--primary);
    }

    .type-icon.text {
        background: var(--surface-container-highest);
        color: var(--secondary);
    }

    .type-icon svg {
        width: 18px;
        height: 18px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .item-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--on-surface);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .item-size {
        font-size: 14px;
        color: var(--on-surface-variant);
    }

    .item-ip {
        font-size: 13px;
        color: var(--on-surface-variant);
    }

    .item-time {
        font-size: 12px;
        color: var(--on-surface-variant);
        letter-spacing: 0.02em;
    }

    .context-menu {
        position: fixed;
        z-index: 10000;
        background: var(--surface);
        border: 1px solid var(--outline-variant);
        border-radius: var(--radius);
        box-shadow: var(--shadow-md);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        padding: 4px;
        min-width: 160px;
    }

    .context-menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: var(--on-surface);
        background: none;
        border: none;
        width: 100%;
        text-align: left;
        transition: background var(--dur-fast) var(--ease);
    }

    .context-menu-item:hover {
        background: var(--surface-container-highest);
    }

    .context-menu-item.danger {
        color: var(--error);
    }

    .context-menu-separator {
        height: 1px;
        background: var(--outline-variant);
        margin: 4px 8px;
    }
`;

export default HistoryStyle;
