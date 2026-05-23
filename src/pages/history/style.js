import styled from "styled-components";

const HistoryStyle = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;

    .toolbar {
        display: flex;
        align-items: center;
        justify-content: right;
        gap: 8px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e0e0e0;
        margin-bottom: 5px;
        flex-shrink: 0;
    }

    .toolbar-label {
        font-size: 14px;
        color: #666;
    }

    .clear-btn {
        padding: 4px 12px;
        font-size: 12px;
        background-color: #e74c3c;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .clear-btn:hover {
        background-color: #c0392b;
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
        background-color: white;
        z-index: 10;
        height: 60px;
        transition: box-shadow 0.3s ease;
    }

    .historyTable.sticky-shadow thead {
        box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.15);
    }

    th {
        text-align: left;
        word-wrap: break-word;
        word-break: break-word;
    }

    .historyRow {
        box-sizing: border-box;
        height: 46px;
        padding: 5px;

        border-radius: 14px;

        overflow: hidden;

        td {
            vertical-align: middle;
            height: 46px;
            line-height: 1.5em;
        }
    }

    .historyRow:hover {
        background-color: rgba(128, 128, 128, 0.43);
    }

    .hisType {
        font-weight: bold;
    }

    .hisOverwrite {
        color: ${props => props.isOverwrite ? 'red' : 'inherit'};
    }

    .hisContent {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.5em;
        word-break: break-word;
    }

    .context-menu {
        position: fixed;
        z-index: 10000;
        background-color: var(--card-bg-color, white);
        border: 1px solid var(--border-color, #ccc);
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 4px 0;
        min-width: 100px;
        font-size: 14px;
    }

    .context-menu-item {
        padding: 8px 16px;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .context-menu-item:hover {
        background-color: var(--hover-bg-color, #f0f0f0);
    }
`

export default HistoryStyle;
