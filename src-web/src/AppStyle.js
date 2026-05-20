import styled from "styled-components";

const AppStyle = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;

    text-align: center;
    justify-items: center;

    main {
        width: 100%;
        margin: 10px auto 30px auto;
    }

    .appTitle {
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
    }

    .appSubtitle {
        margin-top: 0;
    }

    .qrCodeArea {
        box-sizing: border-box;
        display: flex;
        width: 100%;
        height: 40px;
        flex-direction: column;

        align-items: center;

        background-color: transparent;
        border-radius: 6px;
        overflow: visible;
        user-select: none;
        z-index: 1000;

        .qrIcon {
            width: 50px;
            height: 50px;
            background-color: white;
            border-radius: 4px;
            cursor: pointer;
        }

        .qrPopupContainer {
            width: 200px;
            height: 200px;
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transform: scale(0.8);
            transition: all 0.3s ease-out;
            transition-delay: 618ms;
            z-index: 1001;
        }

        .qrContentWrapper {
            background-color: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }

        .qrImage {
            opacity: 1;
            visibility: visible;
        }

        .qrUrlDisplay {
            opacity: 1;
            visibility: visible;
            margin: 2px 0;
            color: #666;
            font-size: small;
            text-align: center;
            word-break: break-all;
            /* 确保网页URL可选中 */
            user-select: text;
        }
    }

    .qrIcon:hover ~ .qrPopupContainer,
    .qrPopupContainer:hover {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transform: scale(1);
        transition: all 150ms ease-in;
        transition-delay: 0ms;
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