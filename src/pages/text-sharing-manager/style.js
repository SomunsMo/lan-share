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
    }

    .textEditActions {
        margin: 10px;
        text-align: center;
    }

    .sharingHistory {
        width: 100%;
        height: 100%;
        overflow-y: auto;
        display: block;
    }

    .historyTable {
        width: 100%;
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
    }

    .historyRow {
        box-sizing: border-box;
        height: 46px;
        padding: 5px;

        border-radius: 14px;

        overflow: hidden;
    }

    .historyRow:hover {
        background-color: rgba(128, 128, 128, 0.43);
    }

    .hisTime {
    }

    .hisContent {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        overflow: hidden;
        text-overflow: ellipsis;
        max-height: calc(1.5em * 3);
        line-height: 1.5em;
    }

    .context-menu {
        position: fixed;
        z-index: 10000;
        background-color: var(--card-bg-color, white);
        border: 1px solid var(--border-color, #ccc);
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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