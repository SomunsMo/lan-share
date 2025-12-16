import React, {useEffect, useState} from 'react';
import Card from "../Card/Card.js";
import TextSharingStyle from "./TextSharingStyle.js";
import {getTextSharingAPI, uploadTextAPI} from "../../service/API.js";
import copy from "copy-to-clipboard";

function TextSharing() {
    // 将被上传的文本
    const [uploadText, setUploadText] = useState("");
    // 已被上传的文本列表
    const [textHistory, setTextHistory] = useState([
        {
            id: 1,
            content: "测试文本",
            created_at: "2025-10-30 21:00:00",
            ip: "192.168.31.1"
        },
        {
            id: 2,
            content: "测试文本2",
            created_at: "2025-10-30 22:00:00",
            ip: "192.168.31.2"
        }
    ]);


    useEffect(() => {
        flushHistoryList();
    }, []);

    // 调用接口，获取历史文本
    const flushHistoryList = () => {
        getTextSharingAPI().then(res => {
            if (res.code !== 200) {
                console.error("获取历史文本异常")
                return;
            }
            setTextHistory(res.data);
        })
    }

    // 发送文本输入框内容被改变时
    const uploadTextOnChange = (e) => {
        setUploadText(e.target.value);
    }

    // 发送文本到服务器
    const sendText = () => {
        uploadTextAPI(uploadText)
            .then(res => {

                if (res.code !== 200) {
                    console.error("发送文本到服务器失败")
                    return;
                }

                // 清空文本输入框
                setUploadText("");
                // 刷新历史列表
                flushHistoryList();
            });
    }

    const copyText = (text) => {
        console.log(123)
        copy(text);
    }


    return (
        <TextSharingStyle>
            <Card>
                {/*文本上传区域*/}
                <textarea id="textInput" value={uploadText} onChange={uploadTextOnChange}></textarea>
                <div>
                    <button onClick={sendText}>发送文本</button>
                </div>
            </Card>

            {/*历史内容展示区*/}
            <Card>
                <ul className="textHistory">
                    {textHistory.map(v => {
                        return (
                            <li key={v.id} onDoubleClick={() => {
                                copyText(v.content)
                            }}>
                                <p>{v.content}</p>
                                <p className="metaInfo">{v.created_at} | {v.ip}</p>
                            </li>
                        )
                    })}
                </ul>
                <p className="cardTips">双击文本复制</p>
            </Card>
        </TextSharingStyle>
    );
}

export default TextSharing;