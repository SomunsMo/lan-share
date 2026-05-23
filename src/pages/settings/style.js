import styled from "styled-components";

const SettingsStyle = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));

    user-select: none;

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

    .port-text {
        cursor: pointer;
        display: inline-block;
    }

    .port-text:hover {
        text-decoration: underline;
    }

`
export default SettingsStyle;