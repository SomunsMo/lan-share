import React, {useEffect, useState, useMemo} from 'react';
import Card from "../Card/Card.js";
import TextSharingStyle from "./TextSharingStyle.js";
import {getUploadRecordsAPI, uploadTextAPI, recordCopyAPI} from "../../service/API.js";
import {useToast} from "@/component/Toast/index.jsx";
import copy from "copy-to-clipboard";
import {useTranslation} from "react-i18next";

function TextSharing() {
    const { t } = useTranslation();
    const {showToast} = useToast();
    const isTouch = useMemo(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0, []);
    const [uploadText, setUploadText] = useState("");
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, content: '', id: null, actionType: null });
    const [records, setRecords] = useState([]);
    const [filterType, setFilterType] = useState('all');

    const filteredRecords = useMemo(() => {
        if (filterType === 'all') return records;
        const type = filterType === 'text' ? 1 : 5;
        return records.filter(r => r.action_type === type);
    }, [records, filterType]);

    useEffect(() => {
        flushRecords();
    }, []);

    const flushRecords = () => {
        getUploadRecordsAPI().then(res => {
            if (res.code !== 200) {
                console.error("获取记录列表异常")
                showToast({message: t('textSharing.toast.loadFailed', {error: res.msg || '未知错误'}), type: 'error'});
                return;
            }
            setRecords(res.data);
        }).catch(error => {
            console.error("获取记录列表异常", error);
            showToast({message: t('textSharing.toast.loadFailed', {error: error.message || '未知错误'}), type: 'error'});
        })
    }

    const uploadTextOnChange = (e) => {
        setUploadText(e.target.value);
    }

    const sendText = () => {
        uploadTextAPI(uploadText)
            .then(res => {
                if (res.code !== 200) {
                    console.error("发送文本到服务器失败")
                    showToast({message: t('textSharing.toast.sendFailed', {error: res.msg || '未知错误'}), type: 'error'});
                    return;
                }
                setUploadText("");
                flushRecords();
            }).catch(error => {
                console.error("发送文本到服务器失败", error);
                showToast({message: t('textSharing.toast.sendFailed', {error: error.message || '未知错误'}), type: 'error'});
            });
    }

    const showContextMenu = (e, content, id, actionType) => {
        e.preventDefault();
        const x = Math.min(e.clientX, window.innerWidth - 120);
        const y = Math.min(e.clientY, window.innerHeight - 40);
        setContextMenu({ visible: true, x, y, content, id, actionType });
    };

    const hideContextMenu = () => {
        setContextMenu({ visible: false, x: 0, y: 0, content: '', actionType: null });
    };

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

    const copyText = (text, id) => {
        if (id != null) {
            recordCopyAPI(id).catch(() => {});
        }
        copy(text);
        showToast({message: t('textSharing.toast.copied'), type: 'success'});
    }

    return (
        <TextSharingStyle>
            <Card>
                <textarea id="textInput" value={uploadText} onChange={uploadTextOnChange}></textarea>
                <div className="sendBtnWrapper">
                    <button onClick={sendText}>{t('textSharing.sendBtn')}</button>
                </div>
            </Card>

            <Card>
                <div className="recordFilter">
                    <button className={filterType === 'all' ? 'active' : ''} onClick={() => setFilterType('all')}>{t('recordList.filter.all')}</button>
                    <button className={filterType === 'text' ? 'active' : ''} onClick={() => setFilterType('text')}>{t('recordList.filter.text')}</button>
                    <button className={filterType === 'image' ? 'active' : ''} onClick={() => setFilterType('image')}>{t('recordList.filter.image')}</button>
                </div>

                {filteredRecords.length > 0 ? (
                    <ul className="recordList">
                        {filteredRecords.map(v => {
                            if (v.action_type === 1) {
                                return (
                                    <li key={v.id} className="recordItem text"
                                        onDoubleClick={() => copyText(v.content, v.id)}
                                        onContextMenu={(e) => showContextMenu(e, v.content, v.id, 1)}
                                        onMouseEnter={() => { if (contextMenu.visible) hideContextMenu(); }}>
                                        <p className="recordContent">{v.content}</p>
                                        <p className="metaInfo">{v.created_at.replace(/-/g, '/')} | {v.ip}</p>
                                    </li>
                                );
                            }
                            let meta = {};
                            try { meta = JSON.parse(v.content); } catch(e) {}
                            return (
                                <li key={v.id} className="recordItem image">
                                    <img src={`/shared-image/${v.id}`}
                                        alt={meta.original_name || ''}
                                        className="recordThumb" />
                                    <div className="recordBody">
                                        <p className="recordHint">{isTouch ? t('imageSharing.hintMobile') : t('imageSharing.hintDesktop')}</p>
                                        <p className="metaInfo">{v.created_at?.replace(/-/g, '/')} | {v.ip}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="cardTips">{t('recordList.noRecords')}</p>
                )}
            </Card>

            {contextMenu.visible && (
                <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}
                     onClick={(e) => e.stopPropagation()}>
                    <div className="context-menu-item" onClick={() => {
                        copyText(contextMenu.content, contextMenu.id);
                        hideContextMenu();
                    }}>{t('textSharing.contextMenu.copy')}</div>
                </div>
            )}
        </TextSharingStyle>
    );
}

export default TextSharing;
