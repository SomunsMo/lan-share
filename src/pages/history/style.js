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
        --indicator-bg: var(--surface);
        --indicator-shadow: var(--shadow-sm);
        --sliding-invert-color: var(--primary);
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
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.02em;
        color: var(--on-surface-variant);
        background: transparent;
        transition:
            background-color var(--dur-fast) var(--ease-standard),
            color var(--dur-fast) var(--ease-standard);
        white-space: nowrap;
    }

    .filter-tab:hover {
        color: var(--on-surface);
        background: transparent;
    }

    /* 完整动效下选中配色由滑块与反色副本承担，悬停也不能盖住滑块 */
    html:not([data-motion="reduced"]) & .filter-tab.active,
    html:not([data-motion="reduced"]) & .filter-tab.active:hover {
        color: var(--on-surface-variant);
        background: transparent;
        box-shadow: none;
    }

    html[data-motion="reduced"] & .filter-tab.active {
        background: var(--surface);
        color: var(--primary);
        box-shadow: var(--shadow-sm);
    }

    .search-box {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--surface-container-low);
        border-radius: var(--radius);
        padding: 4px 12px;
        border: var(--glass-border);
        transition: border-color var(--dur-fast) var(--ease);
        min-width: 300px;
        width: 300px;
    }

    .search-box:hover {
        border-color: var(--primary);
    }

    .search-icon {
        flex-shrink: 0;
        fill: none;
        stroke: var(--on-surface-variant);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        opacity: 0.6;
    }

    .search-input {
        border: none;
        background: transparent;
        outline: none;
        box-shadow: none;
        -webkit-appearance: none;
        font-size: 14px;
        color: var(--on-surface);
        width: 100%;
        padding: 6px 0;
    }

    .search-input:focus {
        outline: none;
        box-shadow: none;
    }

    .search-input::placeholder {
        color: var(--on-surface-variant);
        opacity: 0.5;
    }

    .search-clear {
        flex-shrink: 0;
        cursor: pointer;
        fill: none;
        stroke: var(--on-surface-variant);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        opacity: 0.5;
        transition: opacity var(--dur-fast) var(--ease);
    }

    .search-clear:hover {
        opacity: 1;
    }

    .list-container {
        background: var(--surface-container-lowest);
        border: var(--glass-border);
        border-radius: var(--radius-md);
        overflow: hidden;
        box-shadow: var(--shadow-sm);
        flex: 1;
        display: flex;
        flex-direction: column;
        transition: border-color var(--dur-fast) var(--ease);
    }

    .list-container:hover {
        border-color: var(--primary);
    }

    .list-header {
        display: grid;
        grid-template-columns: 48px 1fr 200px 140px;
        gap: 16px;
        align-items: center;
        padding: 12px 20px;
        background: var(--surface-container-low);
        border-bottom: var(--glass-border);
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
        position: relative;
        display: grid;
        grid-template-columns: 48px 1fr 200px 140px;
        gap: 16px;
        align-items: center;
        padding: 14px 20px;
        border-bottom: var(--glass-border);
        cursor: pointer;
        transition: background-color var(--dur-fast) var(--ease-standard);
        animation: row-enter var(--dur-mid) var(--ease-enter) backwards;
    }

    /* 首次加载/筛选后前 8 行错峰进入，追加分页的行不延迟 */
    .list-row:nth-of-type(2) { animation-delay: var(--motion-stagger); }
    .list-row:nth-of-type(3) { animation-delay: calc(var(--motion-stagger) * 2); }
    .list-row:nth-of-type(4) { animation-delay: calc(var(--motion-stagger) * 3); }
    .list-row:nth-of-type(5) { animation-delay: calc(var(--motion-stagger) * 4); }
    .list-row:nth-of-type(6) { animation-delay: calc(var(--motion-stagger) * 5); }
    .list-row:nth-of-type(7) { animation-delay: calc(var(--motion-stagger) * 6); }
    .list-row:nth-of-type(8) { animation-delay: calc(var(--motion-stagger) * 7); }
    .list-row:nth-of-type(9) { animation-delay: calc(var(--motion-stagger) * 8); }

    .list-row::before {
        content: '';
        position: absolute;
        left: 0;
        top: 10px;
        bottom: 10px;
        width: 2px;
        border-radius: 2px;
        background: var(--primary);
        transform: scaleY(0);
        transform-origin: center;
        transition: transform var(--dur-fast) var(--ease-standard);
    }

    .list-row:hover::before {
        transform: scaleY(1);
    }

    .list-row:last-child {
        border-bottom: none;
    }

    .list-row:hover {
        background: var(--surface-container-low);
    }

    .type-icon {
        width: 36px;
        height: 36px;
        border-radius: var(--radius);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .type-icon.upload {
        background: var(--surface-container);
        color: var(--primary);
    }

    .type-icon.text {
        background: var(--surface-container);
        color: var(--primary);
    }

    .type-icon.download {
        background: var(--surface-container);
        color: var(--primary);
    }

    .type-icon.image {
        background: var(--surface-container);
        color: var(--primary);
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

    .item-tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        align-items: center;
    }

    .item-tag {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        line-height: 1.6;
        white-space: nowrap;
    }

    .item-tag.ip {
        background: #E3F2FD;
        color: #1565C0;
    }

    .item-tag.size {
        background: #E8F5E9;
        color: #2E7D32;
    }

    .item-tag.overwrite {
        background: #FFF3E0;
        color: #E65100;
    }

    .item-time {
        font-size: 12px;
        color: var(--on-surface-variant);
        letter-spacing: 0.02em;
    }

    .item-time.sortable {
        cursor: pointer;
        user-select: none;
        transition: color var(--dur-fast) var(--ease);
    }

    .item-time.sortable:hover {
        color: var(--primary);
    }

    .sort-indicator {
        display: inline-block;
        vertical-align: middle;
        margin-left: 2px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        transition: transform var(--dur-fast) var(--ease-enter);
    }

    .sort-indicator.asc {
        transform: rotate(180deg);
    }

    .list-loading {
        text-align: center;
        padding: 16px;
        font-size: 13px;
        color: var(--on-surface-variant);
        animation: fade-in var(--dur-mid) var(--ease-standard);
    }

    .list-end {
        opacity: 0.6;
        font-size: 12px;
    }

    .list-empty {
        opacity: 0.6;
        font-size: 12px;
    }

    .context-menu {
        position: fixed;
        z-index: 10000;
        background: var(--surface);
        border: var(--glass-border);
        border-radius: var(--radius);
        box-shadow: var(--shadow-md);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        padding: 4px;
        min-width: 160px;
        animation: menu-enter var(--dur-fast) var(--ease-enter);
        transform-origin: top left;
    }

    .context-menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.02em;
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
