import styled from "styled-components";

const FileSharingStyle = styled.div`
    display: contents;

    .diskSpaceBar {
        padding: 8px 12px;
        margin-bottom: 8px;
    }

    .diskSpaceInfo {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 13px;
        color: #555;
    }

    .diskSpaceDetail {
        color: #888;
    }

    .diskSpaceProgress {
        width: 100%;
        height: 8px;
        background-color: #e9ecef;
        border-radius: 4px;
        overflow: hidden;
    }

    .diskSpaceProgressFill {
        height: 100%;
        background-color: #4a90d9;
        border-radius: 4px;
        transition: width 0.3s ease;
    }

    .fileList {
        min-height: 400px;
        padding: 5px;
        margin-bottom: 10px;
        background-color: white;

        border-radius: 6px;
        overflow-x: scroll;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
    }

    .fileTable {
        width: 100%;
        min-width: 600px;
        text-align: left;
        border-spacing: 0;
    }

    thead {
        height: 60px;
    }

    tbody {
        width: 100%;
    }

    .fileItem {
        height: 60px;
        padding: 6px;
        margin: 2px;

        align-content: center;
        align-items: center;

        border-radius: 4px;
        cursor: pointer;
    }

    .fileItem:hover {
        background-color: rgba(211, 211, 211, 0.38);
    }

    .goBackItem {
        height: 40px;
    }

    .goBackLabel {
        font-size: 14px;
        color: #666;
        user-select: none;
        -webkit-user-select: none;
    }

    .goBackItem:hover .goBackLabel {
        color: #333;
    }

    .fileItem td:nth-child(n+3) {
        padding-left: 12px;
    }

    thead th:nth-child(n+3) {
        padding-left: 12px;
    }


    tr {
        width: 100%;
    }

    .checkbox {
        text-align: center;
    }

    .iconImg {
        width: 26px;
        height: 32px;
        margin-right: 6px;
        vertical-align: middle;

        user-select: none;
    }

    .fileName {
        display: inline-block;
        max-width: calc(100% - 32px); /* 减去图标宽度，确保留有空间 */
        white-space: nowrap; /* 禁止换行 */
        overflow: hidden; /* 溢出隐藏 */
        text-overflow: ellipsis; /* 溢出显示省略号 */
        vertical-align: top;
        box-sizing: border-box;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
    }

    .fileActions {
        display: none;
        padding: 6px;
        gap: 4px;

        & > span {
            background-color: red;
        }
    }

    .fileItem:hover .fileActions {
        display: flex;
    }

    .dirActions {
        display: none;
    }

    .batchActions {
        display: flex;
        gap: 10px;

        justify-content: center;

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
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

    .context-menu-item-danger {
        color: #e74c3c;
    }

    .context-menu-item-danger:hover {
        background-color: #fef0f0;
    }

`;

export default FileSharingStyle;