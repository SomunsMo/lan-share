import styled from "@emotion/styled";

const TextSharingManagerStyle = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    gap: 24px;
    overflow: hidden;

    .page-header {
        flex-shrink: 0;
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
        margin: 2px 0 0;
    }

    .compose-panel {
        flex-shrink: 0;
        height: 260px;
        display: flex;
        flex-direction: column;
        background: var(--glass-bg);
        backdrop-filter: blur(var(--glass-blur));
        -webkit-backdrop-filter: blur(var(--glass-blur));
        border: var(--glass-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
        overflow: hidden;
    }

    .compose-panel textarea {
        flex: 1;
        width: 100%;
        border: none;
        background: transparent;
        padding: 16px;
        font-size: 18px;
        line-height: 1.6;
        color: var(--on-surface);
        box-sizing: border-box;
        resize: none;
        display: block;
    }

    .compose-panel textarea:focus,
    .compose-panel textarea:focus-visible {
        outline: none;
        box-shadow: none;
        border: none;
    }

    .compose-panel textarea::placeholder {
        color: var(--on-surface-variant);
        opacity: 0.6;
    }

    .compose-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-top: 1px solid var(--outline-variant);
    }

    .char-count {
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.02em;
        color: var(--on-surface-variant);
    }

    .compose-actions {
        display: flex;
        gap: 8px;
    }

    .btn-clear {
        padding: 8px 16px;
        background: var(--surface-container-high);
        color: var(--on-surface);
        border: 1px solid var(--outline-variant);
        border-radius: var(--radius);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color var(--dur-fast) var(--ease);
    }

    .btn-clear:hover {
        background: var(--surface-container-highest);
    }

    .btn-share {
        padding: 8px 24px;
        background: var(--primary);
        color: var(--on-primary);
        border: none;
        border-radius: var(--radius);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color var(--dur-fast) var(--ease);
    }

    .btn-share:hover {
        background: color-mix(in srgb, var(--primary) 90%, transparent);
    }

    .btn-share:active, .btn-clear:active {
        transform: scale(0.97);
    }

    .history-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
    }

    .history-title {
        font-size: 24px;
        font-weight: 600;
        color: var(--on-surface);
        margin-bottom: 16px;
        flex-shrink: 0;
    }

    .history-scroll {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
    }

    .history-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
    }

    .history-card {
        background: var(--glass-bg);
        backdrop-filter: blur(var(--glass-blur));
        -webkit-backdrop-filter: blur(var(--glass-blur));
        border: var(--glass-border);
        border-radius: var(--radius-md);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: var(--shadow-sm);
        transition: box-shadow var(--dur-fast) var(--ease);
        position: relative;
    }

    .history-card:hover {
        box-shadow: var(--shadow-md);
    }

    .card-header {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .card-ip {
        font-size: 13px;
        font-weight: 500;
        color: var(--primary);
    }

    .card-time {
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--on-surface-variant);
    }

    .card-content {
        flex: 1;
        font-size: 16px;
        color: var(--on-surface);
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-word;
    }

    .card-actions {
        display: flex;
        gap: 8px;
        margin-top: auto;
        opacity: 0;
        transition: opacity var(--dur-fast) var(--ease);
    }

    .history-card:hover .card-actions,
    .history-card:focus-within .card-actions {
        opacity: 1;
    }

    .card-action-btn {
        padding: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        border-radius: var(--radius);
        transition: background-color var(--dur-fast) var(--ease);
    }

    .card-action-copy {
        flex: 3;
        background: var(--primary);
        color: var(--on-primary);
        border: none;
    }

    .card-action-copy:hover {
        background: color-mix(in srgb, var(--primary) 90%, transparent);
    }

    .card-action-view {
        flex: 2;
        background: var(--surface);
        color: var(--primary);
        border: 1px solid var(--outline-variant);
    }

    .card-action-view:hover {
        background: var(--surface-container-low);
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

export default TextSharingManagerStyle;
