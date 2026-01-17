import styled from "styled-components";

const TextSharingManagerStyle = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;

    .textEdit {
        width: 100%;
        height: 260px;
        resize: none;
        border: none;
    }

    .textEditActions {
        padding: 8px 5px 0;
        text-align: right;
        border-top: 1px solid lightgrey;
    }

    .textEditActions button {
        padding: 8px 26px;
    }

    .sharingHistory {
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

    /* 当tbody中有多个行且第一个行不在视图中时显示阴影 */

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

export default TextSharingManagerStyle;