import styled from "styled-components";

const TextSharingManagerStyle = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;

    .textEdit {
        flex: 1;
        width: 100%;
        min-height: 100px;
        resize: none;
        border: none;
        background: transparent;
        padding: 0;
        font-size: 0.92rem;
        line-height: 1.6;
        white-space: nowrap;
        overflow-x: auto;
    }

    .textEdit:focus {
        border-color: transparent;
    }

    .textEditActions {
        padding-top: 10px;
        text-align: right;
        margin-top: 10px;
    }

    .textEditActions button {
        padding: 7px 24px;
    }

    > :first-child {
        flex-shrink: 0;
    }

    .sharingHistory {
        width: 100%;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
    }

    > :nth-child(2) {
        min-height: 0;
        overflow: hidden;
    }

    .historyTable {
        width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        border-spacing: 0;
    }

    thead {
        position: sticky;
        top: 0;
        background-color: var(--bg-table-header);
        z-index: 10;
        height: 44px;
    }

    th {
        text-align: left;
        font-weight: 500;
        font-size: 0.82rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 0.65em 0.4em 0.5em;
    }

    .historyRow {
        height: 40px;

        td {
            vertical-align: middle;
            line-height: 1.5;
            font-size: 0.88rem;
            padding: 0.5em 0.4em;
        }
    }

    .historyRow:hover {
        background-color: var(--bg-hover);
    }

    .hisContent {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.5;
        word-break: break-word;
    }

    .context-menu {
        position: fixed;
        z-index: 10000;
        background-color: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow-md);
        padding: 4px 0;
        min-width: 110px;
        font-size: 0.82rem;
    }

    .context-menu-item {
        padding: 7px 16px;
        cursor: pointer;
        color: var(--text-primary);
        transition: background-color 0.12s;
    }

    .context-menu-item:hover {
        background-color: var(--bg-hover);
    }
`

export default TextSharingManagerStyle;
