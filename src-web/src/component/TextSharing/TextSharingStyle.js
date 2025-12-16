import styled from "styled-components";

const TextSharingStyle = styled.div`
    display: contents;


    #textInput {
        display: flex;
        padding: 5px;
        margin-bottom: 10px;
        flex-grow: 1;

        background-color: white;
        font-size: large;

        resize: none;
        outline: none;
        border: none;
        border-radius: 6px;
    }


    .textHistory {
        width: 100%;
        padding: 0;
        margin: 0;
        list-style-type: none;
        flex-grow: 1;

        cursor: default;
        overflow-y: auto;

        li {
            display: flex;
            height: 40px;
            padding: 10px;
            margin: 5px 0;
            flex-direction: column;

            text-align: left;

            border-radius: 4px;
            cursor: pointer;

            p {
                margin: 0;

                /* 禁止换行 */
                white-space: nowrap;
                /* 隐藏溢出内容 */
                overflow: hidden;
                /* 显示省略号 */
                text-overflow: ellipsis;
            }

            .metaInfo {
                font-size: small;
                color: dimgrey;
            }
        }

        li:hover {
            background-color: rgba(211, 211, 211, 0.38);
        }

    }

`
export default TextSharingStyle;