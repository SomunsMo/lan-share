import React, {useEffect, useState} from 'react';
import HomeStyle from "./style.js";
import {invoke} from "@tauri-apps/api/core";

function Home() {
    const [localIp, setLocalIp] = useState("");

    useEffect(() => {
        getLocalIp().catch(e => {
            console.error("获取本机IP失败：", e);
        });
    }, []);

    // 获取本机IP
    const getLocalIp = async () => {
        const ip = await invoke("get_local_ip");
        setLocalIp(ip);
        console.log("得到本机IP:", ip);
    }

    return (
        <HomeStyle>
            <iframe src={`http://${localIp}:3000/web`}/>
        </HomeStyle>
    );
}

export default Home;