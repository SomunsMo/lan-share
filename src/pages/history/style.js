import styled from "styled-components";

const HistoryStyle = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;

    .toolbar {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding-bottom: 10px;
        margin-bottom: 5px;
        flex-shrink: 0;
    }

    .clear-btn {
        padding: 5px 14px;
        font-size: 0.75rem;
        background-color: transparent;
        color: var(--danger);
        border: 1px solid var(--border);
        border-radius: var(--radius);
    }

    .clear-btn:hover {
        background-color: var(--bg-danger-hover);
        border-color: var(--danger);
    }

    .historyContainer {
        width: 100%;
        height: 100%;
        overflow-y: auto;
        display: block;
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

    .hisType {
        font-weight: 500;
    }

    .hisTime {
        color: var(--text-secondary);
        font-size: 0.84rem;
    }

    .hisIp {
        color: var(--text-secondary);
        font-size: 0.84rem;
    }

    .hisOverwrite {
        color: inherit;
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

export default HistoryStyle;
