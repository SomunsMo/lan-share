import React, {useState, useEffect, useRef, useCallback, useLayoutEffect} from 'react';
import TextSharingManagerStyle from "./style.js";
import copy from 'copy-to-clipboard';
import {invoke} from '@tauri-apps/api/core';
import {useTranslation} from "react-i18next";
import {useDialog} from "@/components/dialog/index.jsx";
import {useToast} from "@/components/toast/index.jsx";
import {calcMenuPosition} from "../../utils/menu.js";
import CopyButton from "../../components/copyButton/index.jsx";
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
                                        <TableCell sx={{ color: 'var(--on-surface)' }}>{r.created_at.replace(/-/g, '/')}</TableCell>
                                        <TableCell sx={{ color: 'var(--on-surface)' }}>{r.ip}</TableCell>
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

    const copyToClipboard = useCallback((text) => {
        try {
            copy(text);
        } catch (err) {
            console.error('复制失败:', err);
        }
    }, []);

    const deleteHistoryItem = useCallback(async (itemId) => {
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
            await invoke('delete_text_sharing_record', {id: itemId});
            setHistory(prev => prev.filter(item => item.id !== itemId));
            setContextMenu({visible: false, x: 0, y: 0, item: null});
        } catch (error) {
            console.error('删除文本共享记录失败:', error);
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
                content: record.content
            }));
            setHistory(formattedRecords);
        } catch (error) {
            console.error('获取文本共享历史记录失败:', error);
        }
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

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

    const viewDetail = (item) => {
        showDialog({
            title: t('textSharing.detailTitle'),
            content: (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 24px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', opacity: 0.6, whiteSpace: 'nowrap' }}>{t('textSharing.detailTime')}</span>
                        <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>{item.time}</span>
                        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', opacity: 0.6, whiteSpace: 'nowrap' }}>{t('textSharing.detailIp')}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>{item.ip}</span>
                            <CopyButton text={item.ip} />
                        </span>
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--outline-variant)', margin: '12px 0' }} />
                    <div style={{ maxHeight: '50vh', overflowY: 'auto', fontSize: '14px', lineHeight: 1.6, color: 'var(--on-surface)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.content}</div>
                </div>
            ),
            buttons: [
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
                <Typography variant="h4" fontWeight={700}>{t('textSharing.pageTitle')}</Typography>
                <Typography variant="body2" color="var(--on-surface-variant)">{t('textSharing.pageDesc')}</Typography>
            </div>

            <div className="compose-panel">
                <TextField
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    placeholder={t('textSharing.placeholder')}
                    multiline
                    fullWidth
                    minRows={4}
                    maxRows={12}
                    variant="outlined"
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--surface-container-low)' } }}
                />
                <div className="compose-footer">
                    <span className="char-count">{textValue.length} characters</span>
                    <div className="compose-actions">
                        <Button variant="text" onClick={() => setTextValue("")} size="small">{t('textSharing.clearButton')}</Button>
                        <Button variant="contained" onClick={shareTextViaTauri} size="small">{t('textSharing.shareButton')}</Button>
                    </div>
                </div>
            </div>

            <div className="history-section">
                <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>{t('textSharing.recentTitle')}</Typography>
                <div className="history-scroll" ref={historyContainerRef}>
                    <div className="history-grid">
                    {history.map((item) => (
                        <div
                            className="history-card"
                            key={item.id}
                            onContextMenu={(e) => showContextMenu(e, item)}
                        >
                            <div className="card-header">
                                <span className="card-ip">{item.ip}</span>
                                <span className="card-time">{item.time}</span>
                            </div>
                            <div className="card-content">{item.content}</div>
                            <div className="card-actions">
                                <Button variant="outlined" size="small" onClick={() => copyToClipboard(item.content)}>
                                    {t('textSharing.copyButton')}
                                </Button>
                                <Button variant="text" size="small" onClick={() => viewDetail(item)}>
                                    {t('textSharing.viewButton')}
                                </Button>
                            </div>
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
                    <div className="context-menu-item danger" onClick={() => deleteHistoryItem(contextMenu.item.id)}>
                        {t('textSharing.contextMenu.deleteRecord')}
                    </div>
                </div>
            )}
        </TextSharingManagerStyle>
    );
}

export default TextSharingManager;
