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

`

export default TextSharingManagerStyle;