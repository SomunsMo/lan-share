import styled from "styled-components";

const AppStyle = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100vh;

    > main {
        position: relative;
        width: 100%;
        max-width: 1400px;
        margin: 0 auto;
        padding: 40px 20px 10px;
        text-align: center;
        box-sizing: border-box;
    }

    .appTitle {
        font-size: 1.8rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--text-primary);
    }

    .theme-btn {
        display: inline-flex;
        align-items: center;
        padding: 5px 12px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 20px;
        cursor: pointer;
        color: var(--text-secondary);
        font-family: inherit;
        font-size: 0.88rem;
        transition: border-color 0.15s;
    }

    .theme-btn:hover {
        border-color: var(--accent);
    }

    .theme-toggle-btn {
        position: absolute;
        top: 10px;
        right: 20px;
        display: inline-flex;
        align-items: center;
        padding: 5px 12px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 20px;
        cursor: pointer;
        color: var(--text-secondary);
        font-family: inherit;
        font-size: 0.88rem;
        z-index: 50;
        transition: border-color 0.15s;
    }

    .theme-toggle-btn:hover {
        border-color: var(--accent);
        background-color: var(--bg-card);
    }

    .appSubtitle {
        margin: 4px 0 0;
        font-size: 0.9rem;
        color: var(--text-secondary);
    }

    .qrCodeArea {
        display: inline-flex;
        align-items: center;
        margin-top: 12px;
        position: relative;
    }

    .qrIcon {
        width: 44px;
        height: 44px;
        background-color: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        cursor: pointer;
        padding: 8px;
        box-sizing: border-box;
        transition: border-color 0.15s;
    }

    .qrIcon:hover {
        border-color: var(--accent);
    }

    .qrPopupContainer {
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%) scale(0.9);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: all 0.2s ease;
        padding-top: 8px;
        z-index: 100;
    }

    .qrIcon:hover + .qrPopupContainer,
    .qrPopupContainer:hover {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transform: translateX(-50%) scale(1);
    }

    .qrContentWrapper {
        background-color: var(--bg-card);
        border: 1px solid var(--border);
        padding: 16px;
        border-radius: var(--radius-sm);
        box-shadow: var(--shadow-md);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .qrUrlDisplay {
        margin: 2px 0;
        font-size: 0.78rem;
        color: var(--text-secondary);
        text-align: center;
        white-space: nowrap;
        user-select: text;
        max-width: 260px;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .content {
        display: flex;
        width: 100%;
        max-width: 1400px;
        padding: 0 20px 20px;
        margin: 0 auto;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0;
        box-sizing: border-box;
    }
`

export default AppStyle;
