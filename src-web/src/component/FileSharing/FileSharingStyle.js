import styled from "styled-components";

const FileSharingStyle = styled.div`
    display: contents;

    .fileList {
        min-height: 400px;
        min-width: 600px;
        padding: 5px;
        margin-bottom: 10px;
        background-color: white;

        border-radius: 6px;
        overflow-x: hidden;
        overflow-y: auto;
    }

    .fileTable {
        width: 100%;
        text-align: left;
        border-spacing: 0;
        table-layout: fixed; /* 固定表格布局，使列宽设置生效 */
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

`;

export default FileSharingStyle;