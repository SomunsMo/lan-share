import styled from "styled-components";

const SettingsStyle = styled.div`
    display: flex;
    flex-direction: column;

    user-select: none;

    .clear-text {
        background-color: red;
        color: white;
    }

    .block-title {
        margin: 0 0 15px;
    }

    .options-table {
        width: 100%;
    }

    td {
        box-sizing: border-box;
    }

    .table-value {
        display: flex;
        height: 35px;
        text-align: right;
        justify-content: right;
        align-items: center;
    }

    .directory-text {
        cursor: pointer;
        display: inline-block;
        min-width: 100%;
    }

    .directory-text:hover {
        text-decoration: underline;
    }

`
export default SettingsStyle;