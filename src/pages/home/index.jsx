import React, {useEffect, useState} from 'react';
import HomeStyle from "./style.js";
import {invoke} from "@tauri-apps/api/core";
import {QRCodeSVG} from "qrcode.react";

function Home() {
    const [webUrl, setWebUrl] = useState("");
    const [portOccupied, setPortOccupied] = useState(null); // null=loading, number=被占用的端口号, false=正常

    useEffect(() => {
        fetchServerStatus().catch(e => {
            console.error("获取服务器状态失败：", e);
        });
    }, []);

    // 主动查询HTTP服务器运行状态
    const fetchServerStatus = async () => {
        try {
            const port = await invoke("get_server_status");
            const ip = await invoke("get_local_ip");
            setWebUrl(`http://${ip}:${port}/web`);
            setPortOccupied(false);
        } catch (occupiedPort) {
            setPortOccupied(occupiedPort);
            console.warn("HTTP服务器端口被占用:", occupiedPort);
        }
    }

    return (
        <HomeStyle>
            <div className={"banner"}>
                <h1 className={"title"}>LAN Share</h1>
                <p className={"subtitle"}>基于 Http 的局域网文件传输工具</p>

                {portOccupied === false ? (
                    <div className={"codeArea"}>
                        <p className={"scanTips"}>在其他设备浏览器扫码</p>
                        <QRCodeSVG className={"qrcode"} value={webUrl} fgColor={"#213547"}/>
                        <p className={"urlTips"}>或访问</p>
                        <p className={"qrcodeUrl"}>{webUrl}</p>
                    </div>
                ) : portOccupied != null ? (
                    <div className={"portWarning"}>
                        <div className={"warningIcon"}>&#9888;</div>
                        <h3 className={"warningTitle"}>HTTP 服务未启动</h3>
                        <p className={"warningDesc"}>
                            端口 <strong>{portOccupied}</strong> 已被其他程序占用，HTTP 服务器无法启动。
                        </p>
                        <div className={"warningSteps"}>
                            <p>可选解决方案：</p>
                            <ol>
                                <li>在「设置」中更换 HTTP Server 端口后重启应用</li>
                                <li>退出占用改端口的应用程序</li>
                            </ol>
                        </div>
                    </div>
                ) : null}
            </div>
        </HomeStyle>
    );
}

export default Home;
