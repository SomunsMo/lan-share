import styled from "styled-components";

const NavbarStyle = styled.div`
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 140px;
    height: 100%;

    border-right: 1px solid lightgrey;
    overflow: hidden;
    user-select: none;

    background-color: whitesmoke;

    ul {
        display: flex;
        flex-direction: column;
        width: 100%;
        margin: 0;
        padding: 0;
        flex-shrink: 0;
    }

    li {
        box-sizing: border-box;
        margin: 5px;
        flex-shrink: 0;

        justify-content: center;
        align-content: center;
        list-style: none;


        border-radius: 4px;
        cursor: pointer;
    }

    li:hover {

        background-color: lightgrey;
    }

    li img {
        width: 20px;
        height: 20px;
        margin-right: 6px;
    }

    li > a {
        display: flex;
        padding: 10px 20px;
        flex-grow: 1;
        font-weight: bold;

        align-items: center;
    }

    .top {
        flex-grow: 1;
        min-height: 40px;
    }

    .bottom {
        /* 使用伪元素创建一个居中的短边框 */
        position: relative;
        
        flex-grow: 0;
        flex-shrink: 0;
    }

    .bottom::before {
        /* 为底部选项增加顶分隔线*/

        content: '';
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 80%;
        height: 1px;
        background-color: lightgrey;
    }

`
export default NavbarStyle;