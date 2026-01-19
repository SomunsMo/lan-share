import styled from "styled-components";

const HomeStyle = styled.div`
    display: flex;
    width: 100%;
    height: 100%;

    color: #213547;
    justify-content: center;
    align-items: center;

    user-select: none;

    .banner {
        box-sizing: border-box;
        height: 300px;
        margin: 40px;

        text-align: center;
    }

    .title {
        margin-top: 0;
    }

    .codeArea {
        box-sizing: border-box;
        display: flex;
        width: 230px;
        height: 230px;
        margin: 0 auto;
        flex-direction: column;

        justify-content: center;
        align-items: center;

        background-color: white;
        border-radius: 6px;
        overflow: hidden;
    }

    .scanTips {
        padding: 0;
        margin: 10px 0 0;
        color: grey;
        font-size: 0.8rem;
    }

    .qrcode {
    }

    .urlTips {
        padding: 0;
        margin: 15px 0 0;
        color: grey;
        font-size: 0.8rem;
        line-height: 0.8rem;
    }

    .qrcodeUrl {
        margin: 0 0 10px 0;
        line-height: 1rem;
        font-size: 0.8rem;

        user-select: text;
    }


`
export default HomeStyle;