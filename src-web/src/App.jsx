import AppStyle from "./AppStyle.js";
import FileSharing from "./component/FileSharing/index.js";
import {QRCodeSVG} from "qrcode.react";
import TextSharing from "./component/TextSharing/TextSharing.jsx";
import BarcodeIconSvg from './assets/icon/barcode.svg';

function App() {

    const getQrCodeUrl = () => {
        // 获取当前页面url，但去除queryParam
        return window.location.href.split('?')[0];
    }

    return (
        <AppStyle>
            <main>
                <h1 className="app-title">LAN Share</h1>
                <p className="app-subtitle">基于HTTP的局域网文件传输工具</p>
                <div className="qrCodeArea">
                    <img className="qrIcon" src={BarcodeIconSvg} alt="二维码"/>
                    <div className="qr-popup-container">
                        <div className="qr-content-wrapper">
                            <QRCodeSVG className="qr-image" value={getQrCodeUrl()} fgColor="#213547"/>
                            <p className="qr-url-display">{getQrCodeUrl()}</p>
                        </div>
                    </div>
                </div>
            </main>

            <div className="content">
                <TextSharing/>
                <FileSharing/>
            </div>

        </AppStyle>
    )
}

export default App