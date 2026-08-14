import React, {useCallback, useEffect, useRef, useState, useMemo} from 'react';
import Card from "../Card/Card.js";
import TextSharingStyle from "./TextSharingStyle.js";
import FilePreview from "../FilePreview/index.jsx";
import {isPreviewable} from "../FilePreview/PreviewType.js";
import {getFileSuffix, copyToClipboard} from "@/util/file.js";
import {getUploadRecordsAPI, uploadTextAPI, recordCopyAPI, uploadImageAPI} from "../../service/API.js";
import {useDialog} from "@/component/Dialog/useDialog.js";
import {useToast} from "@/component/Toast/useToast.js";
import copy from "copy-to-clipboard";
import {useTranslation} from "react-i18next";
import {subscribe, getClientId} from "../../service/sse.js";
import {track} from "@/service/taskManager.js";

function TextSharing() {
    const { t } = useTranslation();
    const {showToast} = useToast();
    const {showDialog} = useDialog();
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

    // 预览浮层 URL（null 表示关闭）
    const [previewUrl, setPreviewUrl] = useState(null);
    // 正在预览的文件名
    const [previewTitle, setPreviewTitle] = useState('');
    // 当前预览类型（image/text/pdf/audio），用于 FilePreview 渲染分支
    const [previewType, setPreviewType] = useState(null);
    const [imageMenu, setImageMenu] = useState({visible: false, x: 0, y: 0, id: null, name: '', canPreview: false});
    const longPressTimerRef = useRef(null);

    const flushRecords = useCallback(() => {
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
    }, [showToast, t]);

    useEffect(() => {
        flushRecords();
    }, [flushRecords]);

    const showToastRef = useRef();
    const tRef = useRef();
    const flushRecordsRef = useRef();
    showToastRef.current = showToast;
    tRef.current = t;
    flushRecordsRef.current = flushRecords;

    useEffect(() => {
        const unsub = subscribe((evt) => {
            if (evt.type === 'reload') {
                flushRecordsRef.current();
                return;
            }
            if (evt.kind === 'text' || evt.kind === 'image') {
                const isSelf = evt.client_id && evt.client_id === getClientId();
                flushRecordsRef.current();
                if (!isSelf && evt.action === 'upload') {
                    showToastRef.current({
                        message: tRef.current(evt.kind === 'text' ? 'sse.toast.textNew' : 'sse.toast.imageNew'),
                        type: 'info',
                    });
                } else if (!isSelf && evt.action === 'deleted') {
                    showToastRef.current({
                        message: tRef.current(evt.kind === 'text' ? 'sse.toast.textDeleted' : 'sse.toast.imageDeleted'),
                        type: 'info',
                    });
                }
            }
        });
        return unsub;
    }, []);

    const fileInputRef = useRef(null);
    const isSecureContext = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    const uploadImageFile = useCallback((imageFile) => {
        const previewUrl = URL.createObjectURL(imageFile);

        showDialog({
            title: t('imageSharing.pasteTitle'),
            content: (
                <div style={{textAlign: 'center', margin: '12px 0'}}>
                    <img src={previewUrl} alt="paste preview"
                         style={{maxWidth: '100%', maxHeight: '40vh', objectFit: 'contain', borderRadius: '4px'}} />
                </div>
            ),
            buttons: [
                {label: 'common.button.cancel', value: null},
                {
                    label: 'imageSharing.shareButton',
                    value: true,
                    primary: true,
                    loadingLabel: 'imageSharing.sharing',
                    handler: async () => {
                        try {
                            // track 计入活跃任务，端口切换会等图片上传完成后才跳转
                            const res = await track(uploadImageAPI(imageFile));
                            if (res.code !== 200) {
                                showToast({message: t('common.toast.operationFailed'), type: 'error'});
                                return;
                            }
                            showToast({message: t('imageSharing.toast.shared'), type: 'success'});
                            flushRecords();
                        } catch (error) {
                            console.error('上传图片失败:', error);
                            showToast({message: t('common.toast.operationFailed'), type: 'error'});
                        }
                    },
                },
            ],
        }).then(() => {
            URL.revokeObjectURL(previewUrl);
        }).catch(() => {
            URL.revokeObjectURL(previewUrl);
        });
    }, [showDialog, showToast, t, flushRecords]);

    const handlePaste = useCallback((e) => {
        const dt = e.clipboardData || e.nativeEvent?.clipboardData;
        if (!dt) return;

        let imageFile = null;
        let hasImageType = false;
        let hasFileUri = false;

        const items = dt.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item && item.type) {
                    if (item.type.startsWith('image/')) {
                        hasImageType = true;
                        if (item.kind === 'file') {
                            imageFile = item.getAsFile();
                        }
                        if (imageFile) break;
                    }
                    if (item.type === 'text/uri-list' || item.type === 'x-special/gnome-copied-files') {
                        hasFileUri = true;
                    }
                }
            }
        }

        if (!imageFile) {
            const files = dt.files;
            if (files && files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    if (files[i] && files[i].type.startsWith('image/')) {
                        hasImageType = true;
                        imageFile = files[i];
                        break;
                    }
                }
            }
        }

        if (!imageFile) {
            if (hasImageType && !isSecureContext) {
                showToast({message: t('imageSharing.pasteNotSupported'), type: 'info'});
            } else if (hasFileUri) {
                showToast({message: t('imageSharing.pasteFileUriHint'), type: 'info'});
            }
            return;
        }

        e.preventDefault();
        uploadImageFile(imageFile);
    }, [uploadImageFile, isSecureContext, showToast, t]);

    const handleFileInputChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) {
            showToast({message: t('common.toast.operationFailed'), type: 'error'});
            return;
        }
        uploadImageFile(file);
        e.target.value = '';
    }, [uploadImageFile, showToast, t]);

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

    const closeImageMenu = () => {
        setImageMenu({visible: false, x: 0, y: 0, id: null, name: '', canPreview: false});
    };

    const showImageMenu = (e, v) => {
        e.preventDefault();
        e.stopPropagation();
        let meta = {};
        try { meta = JSON.parse(v.content); } catch { /* 解析失败使用空对象 */ }
        const originalName = meta.original_name || '';
        const canPreview = originalName ? isPreviewable(getFileSuffix(originalName)) : false;
        const cx = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
        const cy = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
        const x = Math.min(cx, window.innerWidth - 140);
        const y = Math.min(cy, window.innerHeight - 120);
        setImageMenu({visible: true, x, y, id: v.id, name: originalName, canPreview});
    };

    const startImageLongPress = (e, v) => {
        longPressTimerRef.current = setTimeout(() => showImageMenu(e, v), 500);
    };

    const clearImageLongPress = () => {
        if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    };

    const copyImageLink = (id) => {
        const link = `${window.location.origin}/shared-image/${id}`;
        copyToClipboard(link);
        showToast({message: t('fileSharing.toast.linkCopied'), type: 'success'});
    };

    useEffect(() => {
        const handleClick = (e) => {
            if (e.target.closest('.context-menu')) return;
            if (contextMenu.visible) hideContextMenu();
            if (imageMenu.visible) closeImageMenu();
        };
        const handleScroll = () => {
            if (contextMenu.visible) hideContextMenu();
            if (imageMenu.visible) closeImageMenu();
        };
        document.addEventListener('click', handleClick);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('click', handleClick);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [contextMenu.visible, imageMenu.visible]);

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
                <textarea id="textInput" value={uploadText} onChange={uploadTextOnChange} onPaste={handlePaste}></textarea>
                <div className="sendBtnWrapper">
                    <button onClick={sendText}>{t('textSharing.sendBtn')}</button>
                    <label className="imageUploadBtn" title={t('imageSharing.uploadImageBtn')}>
                        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileInputChange} />
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                    </label>
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
                            try { meta = JSON.parse(v.content); } catch { /* 解析失败使用空对象 */ }
                            const originalName = meta.original_name || '';
                            const canPreview = originalName ? isPreviewable(getFileSuffix(originalName)) : false;
                            return (
                                <li key={v.id} className="recordItem image"
                                    onContextMenu={(e) => showImageMenu(e, v)}
                                    onTouchStart={(e) => startImageLongPress(e, v)}
                                    onTouchEnd={() => clearImageLongPress()}
                                    onTouchMove={() => clearImageLongPress()}>
                                    <img src={`/shared-image/${v.id}`}
                                        alt={originalName}
                                        className={`recordThumb${canPreview ? ' previewableThumb' : ''}`}
                                        onClick={(e) => {
                                            // 仅左键（event.button === 0）触发预览，右键仍走 li 的 contextmenu 下载/复制
                                            if (e.button !== 0 || !canPreview) return;
                                            setPreviewUrl(`/shared-image/${v.id}`);
                                            setPreviewTitle(originalName || v.content || '');
                                            setPreviewType('image');
                                        }} />
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

            {imageMenu.visible && (
                <div className="context-menu" style={{left: imageMenu.x, top: imageMenu.y}} onClick={(e) => e.stopPropagation()}>
                    {imageMenu.canPreview ? (
                        <div className="context-menu-item" onClick={() => {
                            setPreviewUrl(`/shared-image/${imageMenu.id}`);
                            setPreviewTitle(imageMenu.name || '');
                            setPreviewType('image');
                            closeImageMenu();
                        }}>{t('fileSharing.action.preview')}</div>
                    ) : (
                        <div className="context-menu-item" onClick={() => {
                            copyImageLink(imageMenu.id);
                            closeImageMenu();
                        }}>{t('fileSharing.action.copyLink')}</div>
                    )}
                </div>
            )}

            {previewUrl && (
                <FilePreview url={previewUrl} title={previewTitle} type={previewType} onClose={() => {
                    setPreviewUrl(null);
                    setPreviewTitle('');
                    setPreviewType(null);
                }} />
            )}
        </TextSharingStyle>
    );
}

export default TextSharing;
