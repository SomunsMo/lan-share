import styled from "styled-components";

const NavbarStyle = styled.div`
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 100px;
    height: 100%;

    border-right: 1px solid whitesmoke;
    overflow: hidden;

    ul {
        display: flex;
        flex-direction: column;
        width: 100%;
        margin: 0;
        padding: 0;
        flex-shrink: 0;
    }

    li {
        padding: 5px 10px;
        margin: 5px 0;

        justify-content: center;
        align-content: center;
        list-style: none;

        cursor: pointer;
        flex-shrink: 0;
    }

    li:hover {
        color: dodgerblue;
    }

    li > a {
        display: flex;
        flex-grow: 1;
    }

    .top {
        flex-grow: 1;
        min-height: 40px;
    }

    .bottom {
        flex-grow: 0;
        flex-shrink: 0;
    }

`
export default NavbarStyle;