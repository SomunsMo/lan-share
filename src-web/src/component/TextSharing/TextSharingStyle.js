import styled from "@emotion/styled";

const TextSharingStyle = styled.div`
    display: contents;

    #textInput {
        display: flex;
        padding: 0;
        margin-bottom: 10px;
        flex-grow: 1;
        min-height: 90px;
        background: transparent;
        font-size: 0.92rem;
        line-height: 1.6;
        resize: none;
        border: none;
        outline: none;
    }

    .recordList {
        width: 100%;
        padding: 0;
        margin: 0 0 8px;
        list-style-type: none;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        cursor: default;
    }

    .recordItem {
        padding: 8px 10px;
        margin: 2px 0;
        border-radius: var(--radius);
        transition: background-color 0.1s;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .recordItem:hover {
        background-color: var(--bg-hover);
    }

    .recordItem.text {
        cursor: pointer;
        flex-direction: column;
        align-items: stretch;
        gap: 2px;
    }

    .recordItem.text .recordContent {
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.88rem;
    }

    .recordThumb {
        width: 56px;
        height: 56px;
        object-fit: cover;
        border-radius: 4px;
        flex-shrink: 0;
    }

    .recordBody {
        flex: 1;
        min-width: 0;
    }

    .recordBody .recordContent {
        margin: 0 0 2px;
        font-size: 0.88rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .recordHint {
        margin: 0 0 2px;
        font-size: 0.82rem;
        color: var(--text-tertiary);
    }

    .recordBody .metaInfo {
        margin: 0;
    }

    .metaInfo {
        font-size: 0.78rem;
        color: var(--text-tertiary);
    }

    .recordItem.text .metaInfo {
        margin-top: 0;
    }

    .cardTips {
        margin: 0;
        color: var(--text-tertiary);
        font-size: 0.78rem;
        text-align: left;
    }

    .recordFilter {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
    }

    .recordFilter button {
        padding: 4px 14px;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: transparent;
        color: var(--text-secondary);
        font-size: 0.82rem;
        cursor: pointer;
        transition: all 0.15s;
    }

    .recordFilter button:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
    }

    .recordFilter button.active {
        background: var(--accent, #4f8ff7);
        color: #fff;
        border-color: var(--accent, #4f8ff7);
    }

    .sendBtnWrapper {
        text-align: center;
    }

    .context-menu {
        position: fixed;
        z-index: 10001;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        box-shadow: var(--shadow-lg);
        min-width: 100px;
        padding: 4px 0;
    }

    .context-menu-item {
        padding: 8px 16px;
        cursor: pointer;
        font-size: 0.82rem;
        color: var(--text-primary);
        white-space: nowrap;
    }

    .context-menu-item:hover {
        background-color: var(--bg-hover);
    }


`

export default TextSharingStyle;
