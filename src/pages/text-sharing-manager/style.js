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
        display: flex;
        flex-direction: column;
        background: var(--glass-bg);
        backdrop-filter: blur(var(--glass-blur));
        -webkit-backdrop-filter: blur(var(--glass-blur));
        border: var(--glass-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
        overflow: hidden;
        transition: border-color var(--dur-fast) var(--ease);
    }

    .compose-panel:hover {
        border-color: var(--primary);
    }

    .compose-panel .MuiOutlinedInput-root {
        flex: 1;
        background: transparent;
    }

    .compose-panel .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline {
        border: none;
    }

    .compose-panel .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline {
        border: none;
    }

    .compose-panel .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
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
        padding: 0 16px 16px;
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
        transition: box-shadow var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
        position: relative;
        cursor: pointer;
    }

    .history-card:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--primary);
    }

    .card-header {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .card-ip {
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.02em;
        color: var(--primary);
    }

    .card-time {
        font-size: 12px;
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
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.02em;
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
        background: var(--primary-hover);
    }

    .card-action-view {
        flex: 2;
        background: var(--surface);
        color: var(--primary);
        border: var(--glass-border);
    }

    .card-action-view:hover {
        background: var(--surface-container-low);
    }



    .history-card.image-card .card-image-preview {
        padding: 8px;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 80px;
        background: var(--surface-container);
        border-radius: var(--radius);
        cursor: pointer;
    }

    .history-card.image-card .card-image-preview img {
        max-width: 100%;
        max-height: 200px;
        object-fit: contain;
        border-radius: 4px;
    }

    .paste-dialog-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .paste-dialog-box {
        background: var(--surface-container-high);
        border-radius: var(--radius-md);
        padding: 24px;
        min-width: 320px;
        max-width: 500px;
    }

    .paste-preview {
        text-align: center;
        margin: 12px 0;
    }

    .dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
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

export default TextSharingManagerStyle;
