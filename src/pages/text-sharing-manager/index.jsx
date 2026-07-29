import React, {useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo} from 'react';
import TextSharingManagerStyle from "./style.js";
import {invoke} from '@tauri-apps/api/core';
import {useTranslation} from "react-i18next";
import {useDialog} from "@/components/dialog/index.jsx";
import {useToast} from "@/components/toast/index.jsx";
import {calcMenuPosition} from "../../utils/menu.js";
import {copySharedImage} from "../../utils/copyImage.js";
import {copyText} from "../../utils/copyText.js";
import CopyButton from "../../components/copyButton/index.jsx";
import DialogImage from "./DialogImage.jsx";
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

function TextSharingManager(props) {
    const { t } = useTranslation();
    const {showDialog} = useDialog();
    const {showToast} = useToast();
    const [textValue, setTextValue] = useState("");
    const [history, setHistory] = useState([]);
    const [webUrl, setWebUrl] = useState("");

    const ipAddr = useMemo(() => webUrl ? webUrl.split('/')[2].split(':')[0] : '', [webUrl]);
    const portNum = useMemo(() => webUrl ? webUrl.split('/')[2].split(':')[1] : '', [webUrl]);

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        let size = bytes;
        while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
        return size.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
    };

    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        item: null
    });
    const [menuVersion, setMenuVersion] = useState(0);
    const historyContainerRef = useRef(null);
    const contextMenuRef = useRef(null);
    const mousePosRef = useRef({ x: 0, y: 0 });

    const viewCopyRecords = useCallback(async (item) => {
        try {
            const records = await invoke('get_copy_records', {sourceId: item.id});
            if (!records || records.length === 0) {
                showToast({message: t('history.noCopyRecords'), type: 'info'});
                return;
            }
            showDialog({
                title: t('history.copyRecordsTitle'),
                content: (
                    <TableContainer component={Paper} sx={{ maxHeight: '50vh', boxShadow: 'none' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600, color: 'var(--on-surface-variant)', width: 50 }}>{t('history.copyRecordsSeq')}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: 'var(--on-surface-variant)' }}>{t('history.tableHeader.time')}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: 'var(--on-surface-variant)' }}>{t('history.tableHeader.sourceIp')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {records.map((r, i) => (
                                    <TableRow key={r.id}>
                                        <TableCell sx={{ color: 'var(--on-surface-variant)' }}>{i + 1}</TableCell>
                                        <TableCell sx={{ color: 'var(--on-surface)', userSelect: 'text' }}>{r.created_at.replace(/-/g, '/')}</TableCell>
                                        <TableCell sx={{ color: 'var(--on-surface)', userSelect: 'text' }}>{r.ip}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ),
                buttons: [
                    {label: 'common.button.confirm', value: true, primary: true},
                ],
            });
        } catch (error) {
            console.error('获取复制记录失败:', error);
            showToast({message: t('common.toast.operationFailed'), type: 'error'});
        }
    }, [showDialog, showToast, t]);

    const copyToClipboard = useCallback(async (text) => {
        try {
            await copyText(text);
            showToast({message: t('common.toast.copied'), type: 'success'});
        } catch (err) {
            console.error('复制失败:', err);
        }
    }, [showToast, t]);

    const deleteHistoryItem = useCallback(async (item) => {
        const confirmed = await showDialog({
            title: t('history.clearDialog.title'),
            content: t('textSharing.deleteCascadeWarning'),
            buttons: [
                {label: 'common.button.cancel', value: false},
                {label: 'common.button.delete', value: true, primary: true, danger: true},
            ],
        });
        if (!confirmed) return;
        try {
            await invoke('delete_record', {id: item.id, actionType: item.action_type});
            setHistory(prev => prev.filter(i => i.id !== item.id));
            setContextMenu({visible: false, x: 0, y: 0, item: null});
        } catch (error) {
            console.error('删除记录失败:', error);
        }
    }, [showDialog, t]);

    const showContextMenu = useCallback((e, item) => {
        e.preventDefault();
        mousePosRef.current = { x: e.clientX, y: e.clientY };
        setContextMenu({
            visible: true,
            x: e.clientX - 10,
            y: e.clientY,
            item: item
        });
        setMenuVersion(v => v + 1);
    }, []);

    useLayoutEffect(() => {
        if (menuVersion === 0 || !contextMenu.visible || !contextMenuRef.current) return;
        const rect = contextMenuRef.current.getBoundingClientRect();
        const pos = calcMenuPosition(mousePosRef.current.x, mousePosRef.current.y, rect.width, rect.height);
        if (pos.x !== rect.left || pos.y !== rect.top) {
            setContextMenu(prev => ({ ...prev, x: pos.x, y: pos.y }));
        }
    }, [menuVersion]);

    const hideContextMenu = useCallback(() => {
        setContextMenu({visible: false, x: 0, y: 0, item: null});
    }, []);

    const loadHistory = useCallback(async () => {
        try {
            const records = await invoke('get_text_sharing_history');
            const formattedRecords = records.map(record => ({
                id: record.id,
                time: record.created_at.replace(/-/g, '/'),
                ip: record.ip,
                content: record.content,
                action_type: record.action_type
            }));
            setHistory(formattedRecords);
        } catch (error) {
            console.error('获取文本共享历史记录失败:', error);
        }
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    useEffect(() => {
        const fetchNetworkInfo = async () => {
            try {
                const ip = await invoke('get_local_ip');
                const port = await invoke('get_running_port');
                setWebUrl(`http://${ip}:${port}/web`);
            } catch (error) {
                console.error('获取网络信息失败:', error);
            }
        };
        fetchNetworkInfo();
    }, []);

    const shareTextViaTauri = async () => {
        if (!textValue.trim()) {
            return;
        }

        try {
            await invoke('share_text_to_lan', {textData: textValue});
            setTextValue("");
            loadHistory();
        } catch (error) {
            console.error("通过Tauri分享文本失败:", error);
        }
    }

    // 解析 file:// URI 列表，返回第一个图片文件路径
    const extractImagePathFromUriList = useCallback((text) => {
        for (const line of text.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            let path = trimmed;
            if (path.startsWith('file://')) {
                path = decodeURIComponent(path.slice(7));
                if (path.startsWith('localhost/')) path = path.slice(10);
                if (path.startsWith('/')) { /* absolute path */ }
                else {
                    const idx = path.indexOf('/');
                    if (idx >= 0) path = path.substring(idx);
                }
            }
            const ext = path.split('.').pop()?.toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif'].includes(ext)) {
                return path;
            }
        }
        return null;
    }, []);

    // 通过 Async Clipboard API 读取剪贴板图片（Tauri 安全上下文下可用）
    const readClipboardViaAsyncApi = useCallback(() => {
        if (!navigator.clipboard?.read) return;
        navigator.clipboard.read().then((clipboardItems) => {
            for (const item of clipboardItems) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        item.getType(type).then((blob) => {
                            blob.arrayBuffer().then((buffer) => {
                                const bytes = new Uint8Array(buffer);
                                invoke('read_clipboard_image', { imageBytes: Array.from(bytes), filePath: null })
                                    .then((result) => {
                                        if (result) {
                                            showToast({message: t('common.toast.shared'), type: 'success'});
                                            loadHistory();
                                        }
                                    })
                                    .catch(() => {});
                            });
                        });
                        return;
                    }
                }
            }
        }).catch(() => {});
    }, [showToast, loadHistory, t]);

    const handlePaste = useCallback((e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        // Phase 1: 原有逻辑 — image/* + getAsFile 成功（保持 handler 同步，不改变原有行为）
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    const previewUrl = URL.createObjectURL(file);
                    showDialog({
                        title: t('imageSharing.pasteTitle'),
                        content: (
                            <div className="paste-preview">
                                <DialogImage src={previewUrl} alt="paste preview" />
                            </div>
                        ),
                        buttons: [
                            {label: 'common.button.cancel', value: null},
                            {
                                label: 'imageSharing.shareButton',
                                value: true,
                                primary: true,
                                action: async () => {
                                    const buffer = await file.arrayBuffer();
                                    const bytes = new Uint8Array(buffer);
                                    try {
                                        await invoke('read_clipboard_image', { imageBytes: Array.from(bytes), filePath: null });
                                        showToast({message: t('common.toast.shared'), type: 'success'});
                                        loadHistory();
                                    } catch (error) {
                                        console.error('保存图片失败:', error);
                                        showToast({message: t('common.toast.operationFailed'), type: 'error'});
                                    }
                                }
                            },
                        ],
                    }).then(() => {
                        URL.revokeObjectURL(previewUrl);
                    });
                    return;
                }
            }
        }

        // Phase 2: text/uri-list（资源管理器复制）— 用 getAsString 回调，不引入 await
        for (let i = 0; i < items.length; i++) {
            if (items[i].type === 'text/uri-list' || items[i].type === 'x-special/gnome-copied-files') {
                items[i].getAsString((uriText) => {
                    if (!uriText) return;
                    const filePath = extractImagePathFromUriList(uriText);
                    if (filePath) {
                                invoke('read_clipboard_image', { imageBytes: null, filePath })
                                    .then((result) => {
                                        if (result) {
                                            showToast({message: t('common.toast.shared'), type: 'success'});
                                            loadHistory();
                                        }
                                    })
                                    .catch((err) => {
                                        console.error('读取图片文件失败:', err);
                                showToast({message: t('common.toast.operationFailed'), type: 'error'});
                            });
                    }
                });
                e.preventDefault();
                return;
            }
        }

        // Phase 3: Async Clipboard API — navigator.clipboard.read()
        // 安全上下文下可读浏览器"复制图片"的数据
        readClipboardViaAsyncApi();

        // Phase 4: Rust 模板方法兜底（延迟执行，不影响同步粘贴）
        setTimeout(() => {
            invoke('read_clipboard_image', { imageBytes: null, filePath: null })
                .then((result) => {
                    if (result) {
                        showToast({message: t('common.toast.shared'), type: 'success'});
                        loadHistory();
                    }
                })
                .catch(() => {});
        }, 100);
    }, [showDialog, showToast, t, loadHistory, extractImagePathFromUriList, readClipboardViaAsyncApi]);

    const copyImageToClipboard = useCallback(async (item) => {
        try {
            const content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
            await copySharedImage(content.path);
            showToast({message: t('common.toast.copied'), type: 'success'});
        } catch (error) {
            console.error('复制图片到剪贴板失败:', error);
            showToast({message: t('common.toast.operationFailed'), type: 'error'});
        }
    }, [showToast, t]);

    const viewImageDetail = (item) => {
        const content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
        const imgUrl = 'http://' + ipAddr + ':' + portNum + '/shared-image/' + item.id;
        showDialog({
            title: t('imageSharing.detailTitle'),
            content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 24px', fontSize: '13px' }}>
                        <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6, whiteSpace: 'nowrap' }}>{t('textSharing.detailTime')}</span>
                        <span style={{ color: 'var(--on-surface-variant)', userSelect: 'text' }}>{item.time}</span>
                        <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6, whiteSpace: 'nowrap' }}>{t('textSharing.detailIp')}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--on-surface-variant)', userSelect: 'text' }}>{item.ip}</span>
                            <CopyButton text={item.ip} />
                        </span>
                        <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6, whiteSpace: 'nowrap' }}>{t('imageSharing.detailSha256')}</span>
                        <span style={{ color: 'var(--on-surface-variant)', userSelect: 'text', fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>{content.sha256}</span>
                        <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6, whiteSpace: 'nowrap' }}>{t('imageSharing.detailSize')}</span>
                        <span style={{ color: 'var(--on-surface-variant)', userSelect: 'text' }}>{formatFileSize(content.size)}</span>
                    </div>
                    <DialogImage src={imgUrl} alt={content.original_name} />
                </div>
            ),
            buttons: [
                { label: 'textSharing.copyButton', value: null, handler: () => copyImageToClipboard(item) },
                { label: 'common.button.confirm', value: true, primary: true },
            ],
        });
    };

    const viewDetail = (item) => {
        if (item.action_type === 5) {
            viewImageDetail(item);
            return;
        }
        showDialog({
            title: t('textSharing.detailTitle'),
            content: (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 24px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', opacity: 0.6, whiteSpace: 'nowrap' }}>{t('textSharing.detailTime')}</span>
                        <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)', userSelect: 'text' }}>{item.time}</span>
                        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', opacity: 0.6, whiteSpace: 'nowrap' }}>{t('textSharing.detailIp')}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)', userSelect: 'text' }}>{item.ip}</span>
                            <CopyButton text={item.ip} />
                        </span>
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--outline-variant)', margin: '12px 0' }} />
                    <div style={{ maxHeight: '50vh', overflowY: 'auto', fontSize: '14px', lineHeight: 1.6, color: 'var(--on-surface)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text' }}>{item.content}</div>
                </div>
            ),
            buttons: [
                { label: 'textSharing.copyButton', value: null, handler: () => copyToClipboard(item.content) },
                { label: 'common.button.confirm', value: true, primary: true },
            ],
        });
    }

    useEffect(() => {
        const handleClickOutside = () => {
            if (contextMenu.visible) {
                setContextMenu({visible: false, x: 0, y: 0, item: null});
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [contextMenu.visible]);

    return (
        <TextSharingManagerStyle>
            <div className="page-header">
                <Typography variant="h4" sx={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--on-surface)' }}>{t('textSharing.pageTitle')}</Typography>
                <Typography variant="body2" fontSize="1.125rem" sx={{ color: 'var(--on-surface-variant)' }}>{t('textSharing.pageDesc')}</Typography>
            </div>

            <div className="compose-panel">
                <TextField
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={t('textSharing.placeholder')}
                    multiline
                    fullWidth
                    minRows={6}
                    maxRows={10}
                    variant="outlined"
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'transparent' } }}
                />
                <div className="compose-footer">
                    <span className="char-count">{textValue.length} characters</span>
                    <div className="compose-actions">
                        <Button variant="text" onClick={() => setTextValue("")} size="small" sx={{ '&:hover': { background: 'var(--surface-container-highest)' } }}>{t('textSharing.clearButton')}</Button>
                        <Button variant="contained" onClick={shareTextViaTauri} size="small" sx={{ '&:hover': { backgroundColor: 'var(--primary-hover)' } }}>{t('textSharing.shareButton')}</Button>
                    </div>
                </div>
            </div>

            <div className="history-section">
                <Typography variant="h6" fontSize="1.5rem" fontWeight={600} sx={{ color: 'var(--on-surface)', mb: 1.5 }}>{t('textSharing.recentTitle')}</Typography>
                <div className="history-scroll" ref={historyContainerRef}>
                    <div className="history-grid">
                    {history.map((item) => (
                        <div
                            className={'history-card' + (item.action_type === 5 ? ' image-card' : '')}
                            key={item.id}
                            onClick={() => viewDetail(item)}
                            onContextMenu={(e) => showContextMenu(e, item)}
                        >
                            <div className="card-header">
                                <span className="card-ip">{item.ip}</span>
                                <span className="card-time">{item.time}</span>
                            </div>
                            {item.action_type === 5 ? (
                                <>
                                    <div className="card-image-preview" onClick={(e) => { e.stopPropagation(); viewDetail(item); }}>
                                        <img src={'http://' + ipAddr + ':' + portNum + '/shared-image/' + item.id} alt="shared image" />
                                    </div>
                                    <div className="card-actions">
                                        <Button variant="outlined" size="small" onClick={(e) => { e.stopPropagation(); copyImageToClipboard(item); }}>
                                            {t('imageSharing.copyImageButton')}
                                        </Button>
                                        <Button variant="text" size="small" onClick={(e) => { e.stopPropagation(); viewDetail(item); }} sx={{ '&:hover': { background: 'var(--surface-container-highest)' } }}>
                                            {t('textSharing.viewButton')}
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="card-content">{item.content}</div>
                                    <div className="card-actions">
                                        <Button variant="outlined" size="small" onClick={(e) => { e.stopPropagation(); copyToClipboard(item.content); }}>
                                            {t('textSharing.copyButton')}
                                        </Button>
                                        <Button variant="text" size="small" onClick={(e) => { e.stopPropagation(); viewDetail(item); }} sx={{ '&:hover': { background: 'var(--surface-container-highest)' } }}>
                                            {t('textSharing.viewButton')}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    </div>
                </div>
            </div>

            {contextMenu.visible && contextMenu.item && (
                <div
                    className="context-menu"
                    ref={contextMenuRef}
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={hideContextMenu}
                >
                    {contextMenu.item.action_type === 5 ? (
                        <>
                            <div className="context-menu-item" onClick={() => { copyImageToClipboard(contextMenu.item); hideContextMenu(); }}>
                                {t('imageSharing.contextMenu.copyImage')}
                            </div>
                            <div className="context-menu-item" onClick={() => { viewDetail(contextMenu.item); hideContextMenu(); }}>
                                {t('imageSharing.contextMenu.viewImage')}
                            </div>
                            <div className="context-menu-separator" />
                            <div className="context-menu-item" onClick={() => { copyToClipboard(contextMenu.item.ip); hideContextMenu(); }}>
                                {t('textSharing.contextMenu.copyIp')}
                            </div>
                            <div className="context-menu-separator" />
                            <div className="context-menu-item danger" onClick={() => deleteHistoryItem(contextMenu.item)}>
                                {t('textSharing.contextMenu.deleteRecord')}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="context-menu-item" onClick={() => { viewDetail(contextMenu.item); hideContextMenu(); }}>
                                {t('textSharing.contextMenu.viewDetail')}
                            </div>
                            <div className="context-menu-item" onClick={() => { viewCopyRecords(contextMenu.item); hideContextMenu(); }}>
                                {t('history.contextMenu.viewCopyRecords')}
                            </div>
                            <div className="context-menu-item" onClick={() => { copyToClipboard(contextMenu.item.content); hideContextMenu(); }}>
                                {t('textSharing.contextMenu.copyContent')}
                            </div>
                            <div className="context-menu-item" onClick={() => { copyToClipboard(contextMenu.item.ip); hideContextMenu(); }}>
                                {t('textSharing.contextMenu.copyIp')}
                            </div>
                            <div className="context-menu-separator" />
                            <div className="context-menu-item danger" onClick={() => deleteHistoryItem(contextMenu.item)}>
                                {t('textSharing.contextMenu.deleteRecord')}
                            </div>
                        </>
                    )}
                </div>
            )}
        </TextSharingManagerStyle>
    );
}

export default TextSharingManager;
