import React, {useEffect, useState} from 'react';
import Card from "../Card/Card.js";
import TextSharingStyle from "./TextSharingStyle.js";
import {getTextSharingAPI, uploadTextAPI} from "../../service/API.js";
import {useToast} from "@/component/Toast/index.jsx";
import copy from "copy-to-clipboard";
import {useTranslation} from "react-i18next";

function TextSharing() {
    const { t } = useTranslation();
    const {showToast} = useToast();
    // 将被上传的文本
    const [uploadText, setUploadText] = useState("");
    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, content: '' });
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
                showToast({message: t('textSharing.toast.loadFailed', {error: res.msg || '未知错误'}), type: 'error'});
                return;
            }
            setTextHistory(res.data);
        }).catch(error => {
            console.error("获取历史文本异常", error);
            showToast({message: t('textSharing.toast.loadFailed', {error: error.message || '未知错误'}), type: 'error'});
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
                    showToast({message: t('textSharing.toast.sendFailed', {error: res.msg || '未知错误'}), type: 'error'});
                    return;
                }

                // 清空文本输入框
                setUploadText("");
                // 刷新历史列表
                flushHistoryList();
            }).catch(error => {
                console.error("发送文本到服务器失败", error);
                showToast({message: t('textSharing.toast.sendFailed', {error: error.message || '未知错误'}), type: 'error'});
            });
    }

    // 显示右键菜单
    const showContextMenu = (e, content) => {
        e.preventDefault();
        const x = Math.min(e.clientX, window.innerWidth - 120);
        const y = Math.min(e.clientY, window.innerHeight - 40);
        setContextMenu({ visible: true, x, y, content });
    };

    // 隐藏右键菜单
    const hideContextMenu = () => {
        setContextMenu({ visible: false, x: 0, y: 0, content: '' });
    };

    // 点击其他区域或滚动时关闭菜单
    useEffect(() => {
        const handleClick = (e) => {
            if (!contextMenu.visible) return;
            if (e.target.closest('.context-menu')) return;
            hideContextMenu();
        };

        const handleScroll = () => {
            if (contextMenu.visible) hideContextMenu();
        };

        document.addEventListener('click', handleClick);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('click', handleClick);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [contextMenu.visible]);

    const copyText = (text) => {
        copy(text);
        showToast({message: t('textSharing.toast.copied'), type: 'success'});
    }


    return (
        <TextSharingStyle>
            <Card>
                {/*文本上传区域*/}
                <textarea id="textInput" value={uploadText} onChange={uploadTextOnChange}></textarea>
                <div className="sendBtnWrapper">
                    <button onClick={sendText}>{t('textSharing.sendBtn')}</button>
                </div>
            </Card>

            {/*历史内容展示区*/}
            <Card>
                <ul className="textHistory">
                    {textHistory.map(v => {
                        return (
                            <li key={v.id} onDoubleClick={() => {
                                copyText(v.content)
                            }} onContextMenu={(e) => showContextMenu(e, v.content)}
                                onMouseEnter={() => {
                                    if (contextMenu.visible) hideContextMenu();
                                }}>
                                <p>{v.content}</p>
                                <p className="metaInfo">{v.created_at.replace(/-/g, '/')} | {v.ip}</p>
                            </li>
                        )
                    })}
                </ul>
                <p className="cardTips">{t('textSharing.tips')}</p>
            </Card>

            {contextMenu.visible && (
                <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}
                     onClick={(e) => e.stopPropagation()}>
                    <div className="context-menu-item" onClick={() => {
                        copyText(contextMenu.content);
                        hideContextMenu();
                    }}>{t('textSharing.contextMenu.copy')}</div>
                </div>
            )}
        </TextSharingStyle>
    );
}

export default TextSharing;