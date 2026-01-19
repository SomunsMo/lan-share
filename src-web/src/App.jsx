import AppStyle from "./AppStyle.js";
import FileSharing from "./component/FileSharing/index.js";
import {QRCodeSVG} from "qrcode.react";
import TextSharing from "./component/TextSharing/TextSharing.jsx";
import {useEffect} from "react";

function App() {
    useEffect(() => {
        // 全局禁用默认的右键菜单
        document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        });
    }, []);

    const getQrCodeUrl = () => {
        // 获取当前页面url，但去除queryParam
        return window.location.href.split('?')[0];
    }

    return (
        <AppStyle>
            <main>
                <h1 className={"title"}>LAN Share</h1>
                <p className={"subtitle"}>基于Rust的局域网文件传输工具</p>
                <div className={"codeArea"}>
                    <QRCodeSVG className={"qrcode"} value={getQrCodeUrl()} fgColor={"#213547"}/>
                    <p className={"qrcodeTips"}>{getQrCodeUrl()}</p>
                </div>
            </main>

            <div className={"content"}>
                <TextSharing/>
                <FileSharing/>
            </div>

        </AppStyle>
    )
}

export default App