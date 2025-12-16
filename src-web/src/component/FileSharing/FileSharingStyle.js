import styled from "styled-components";

const FileSharingStyle = styled.div`
    display: contents;

    .fileList {
        //min-height: 800px;
        min-width: 600px;
        padding: 5px;
        margin-bottom: 10px;
        //flex-grow: 1;
        //flex-direction: column;
        text-align: left;
        border-spacing: 0;


        background-color: white;
        border-radius: 6px;

        overflow: auto;

        thead {
            height: 60px;
        }


        .fileItem {
            //display: flex;
            height: 60px;
            padding: 6px;
            margin: 2px;
            //flex-shrink: 0;

            align-content: center;
            align-items: center;

            border-radius: 4px;

        }

        .fileItem:hover {
            background-color: rgba(211, 211, 211, 0.38);
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

    }

    .batchActions {
        display: flex;
        gap: 10px;

        justify-content: center;
    }


`
export default FileSharingStyle;