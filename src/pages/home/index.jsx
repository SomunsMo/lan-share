import React, {useEffect, useState} from 'react';
import HomeStyle from "./style.js";
import {invoke} from "@tauri-apps/api/core";
import {QRCodeSVG} from "qrcode.react";

function Home() {
    const [localIp, setLocalIp] = useState("");
    const [webUrl, setWebUrl] = useState("none");

    useEffect(() => {
        getLocalIp().catch(e => {
            console.error("获取本机IP失败：", e);
        });
    }, []);

    // 获取本机IP
    const getLocalIp = async () => {
        const ip = await invoke("get_local_ip");
        setLocalIp(ip);
        setWebUrl(`http://${localIp}:3000/web`);

        console.log("得到本机IP:", ip);
    }

    const urlChanged = (e) => {
        console.log("url更改")
    }

    return (
        <HomeStyle>
            <div className={"banner"}>
                <h1 className={"title"}>LAN Share</h1>
                <p className={"subtitle"}>基于Rust的局域网文件传输工具</p>
                <div className={"codeArea"}>
                    <QRCodeSVG className={"qrcode"} value={webUrl} fgColor={"#213547"}/>
                    <p className={"qrcodeTips"}>{webUrl}</p>
                </div>
            </div>
        </HomeStyle>
    );
}

export default Home;