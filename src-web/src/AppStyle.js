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

    .app-subtitle {
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
            width: 40px;
            height: 40px;
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .qr-popup-container {
            width: 200px;
            height: 200px;
            opacity: 0;
            visibility: hidden;
            transform: scale(0.8);
            transition: all 0.3s ease;
            transition-delay: 618ms;
            z-index: 1001;
        }

        .qr-content-wrapper {
            background-color: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }

        .qr-image {
            opacity: 1;
            visibility: visible;
        }

        .qr-url-display {
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

    .qrIcon:hover ~ .qr-popup-container,
    .qr-popup-container:hover {
        opacity: 1;
        visibility: visible;
        transform: scale(1);
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