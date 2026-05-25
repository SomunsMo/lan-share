import styled from "styled-components";

const TextSharingStyle = styled.div`
    display: contents;

    #textInput {
        display: flex;
        padding: 0;
        margin-bottom: 10px;
        flex-grow: 1;
        min-height: 90px;
        background: transparent;
        font-size: 0.92rem;
        line-height: 1.6;
        resize: none;
        border: none;
        outline: none;
    }

    .textHistory {
        width: 100%;
        padding: 0;
        margin: 0 0 8px;
        list-style-type: none;
        flex-grow: 1;
        cursor: default;
        overflow-y: auto;

        li {
            padding: 8px 10px;
            margin: 2px 0;
            border-radius: var(--radius);
            cursor: pointer;
            transition: background-color 0.1s;

            p {
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: 0.88rem;
            }

            .metaInfo {
                font-size: 0.78rem;
                color: var(--text-tertiary);
                margin-top: 2px;
            }
        }

        li:hover {
            background-color: var(--bg-hover);
        }
    }

    .cardTips {
        margin: 0;
        color: var(--text-tertiary);
        font-size: 0.78rem;
        text-align: left;
    }

    .cardTips::before {
        content: "说明：";
    }
`

export default TextSharingStyle;
