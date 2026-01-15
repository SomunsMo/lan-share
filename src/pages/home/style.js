import styled from "styled-components";

const HomeStyle = styled.div`
    display: flex;
    width: 100%;
    height: 100%;

    justify-content: center;
    align-items: center;
    
    user-select: none;

    .banner {
        box-sizing: border-box;
        height: 300px;
        margin: 40px;

        text-align: center;
    }

    .codeArea {
        box-sizing: border-box;
        display: flex;
        width: 200px;
        height: 200px;
        margin: 0 auto;
        flex-direction: column;

        justify-content: center;
        align-items: center;

        background-color: white;
        border-radius: 6px;
        overflow: hidden;
    }

    .qrcode {
        margin-top: 10px;
    }

    .qrcodeTips {
        margin: 6px auto;
        color: dimgrey;
        font-size: small;
    }


`
export default HomeStyle;