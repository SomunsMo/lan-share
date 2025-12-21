import styled from "styled-components";

const AppStyle = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;

    text-align: center;
    justify-items: center;

    main {
        width: 100%;
        margin: 40px auto 70px auto;
    }

    .subtitle {
        margin-top: 0;
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
        user-select: none;

        .qrcode {
            margin-top: 10px;
        }

        .qrcodeTips {
            margin: 6px auto;
            color: dimgrey;
            font-size: small;

            // 确保网页URL可选中
            user-select: auto;
        }
    }


    .content {
        display: flex;
        max-width: 1400px;
        padding: 10px;
        margin: 0 auto;
        flex-wrap: wrap;

        justify-content: center;
    }


`
export default AppStyle;