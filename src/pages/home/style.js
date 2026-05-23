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

    .portWarning {
        box-sizing: border-box;
        width: 420px;
        margin: 0 auto;
        padding: 20px 24px;

        background-color: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 8px;

        text-align: left;
        color: #664d03;
    }

    .warningIcon {
        font-size: 2rem;
        margin-bottom: 4px;
        color: #e67e00;
    }

    .warningTitle {
        margin: 0 0 8px;
        color: #996600;
    }

    .warningDesc {
        margin: 0 0 12px;
        font-size: 0.9rem;
        line-height: 1.5;

        strong {
            color: #cc3300;
        }
    }

    .warningSteps {
        font-size: 0.85rem;
        line-height: 1.6;

        p {
            margin: 0 0 4px;
            font-weight: bold;
        }

        ol {
            margin: 0;
            padding-left: 20px;
        }

        li {
            margin-bottom: 2px;
        }

        code {
            background-color: rgba(0,0,0,0.08);
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 0.82rem;
        }
    }
`
export default HomeStyle;
