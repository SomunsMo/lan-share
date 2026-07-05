import React, {useState, useEffect, useRef, useCallback, useLayoutEffect} from 'react';
import HistoryStyle from "./style.js";
import copy from 'copy-to-clipboard';
import {invoke} from '@tauri-apps/api/core';
import {useToast} from "../../components/toast/index.jsx";
import {useDialog} from "../../components/dialog/index.jsx";
import {useTranslation} from "react-i18next";
import {calcMenuPosition} from "../../utils/menu.js";
import CopyButton from "../../components/copyButton/index.jsx";
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

function History() {
    const { t } = useTranslation();
    const [history, setHistory] = useState([]);
    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        item: null
    });
    const [menuVersion, setMenuVersion] = useState(0);
    const [activeFilter, setActiveFilter] = useState("all");
    const historyContainerRef = useRef(null);
    const contextMenuRef = useRef(null);
    const mousePosRef = useRef({ x: 0, y: 0 });
    const {showToast} = useToast();
    const {showDialog} = useDialog();

    const copyToClipboard = useCallback((text) => {
        try {
            copy(text);
        } catch (err) {
            console.error('复制失败:', err);
        }
    }, []);

    const openFileLocation = useCallback(async (item) => {
        try {
            await invoke('open_file_location', {filename: item.content});
        } catch (error) {
            showToast({ message: error, type: 'error' });
        }
    }, [showToast]);

    const openFolder = useCallback(async (filePath) => {
        const folderPath = getFileFolder(filePath);
        try {
            await invoke('open_folder', {path: folderPath});
        } catch (error) {
            showToast({ message: error, type: 'error' });
        }
    }, [showToast]);

    const getFileFolder = (filePath) => {
        const idx = filePath.lastIndexOf('/');
        return idx > 0 ? filePath.substring(0, idx) : filePath;
    };

    const getFileName = (filePath) => {
        const idx = filePath.lastIndexOf('/');
        return idx >= 0 ? filePath.substring(idx + 1) : filePath;
    };

    const deleteHistoryItem = useCallback(async (itemId) => {
        try {
            await invoke('delete_file_sharing_record', {id: itemId});
            setHistory(prev => prev.filter(item => item.id !== itemId));
            setContextMenu({visible: false, x: 0, y: 0, item: null});
        } catch (error) {
            console.error('删除记录失败:', error);
        }
    }, []);

    const deleteTextItem = useCallback(async (itemId) => {
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
            console.error('删除记录失败:', error);
        }
    }, [showDialog, t]);

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

    const viewDetail = (item) => {
        showDialog({
            title: t('history.detailTitle'),
            content: (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 24px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', opacity: 0.6, whiteSpace: 'nowrap' }}>{t('history.tableHeader.type')}</span>
                        <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>{getTypeLabel(item.type)}</span>
                        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', opacity: 0.6, whiteSpace: 'nowrap' }}>{t('history.tableHeader.time')}</span>
                        <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>{item.time}</span>
                        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', opacity: 0.6, whiteSpace: 'nowrap' }}>{t('history.tableHeader.sourceIp')}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>{item.ip}</span>
                            <CopyButton text={item.ip} />
                        </span>
                        {item.type === 2 && (
                            <>
                                <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', opacity: 0.6, whiteSpace: 'nowrap' }}>{t('history.tableHeader.overwrite')}</span>
                                <span style={{ fontSize: '13px', color: item.isOverwrite ? 'var(--error)' : 'var(--on-surface-variant)' }}>{item.isOverwrite ? t('history.overwrite.yes') : t('history.overwrite.no')}</span>
                                <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', opacity: 0.6, whiteSpace: 'nowrap' }}>{t('history.fileFolder')}</span>
                                <span>
                                    <span
                                        style={{ fontSize: '13px', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'none' }}
                                        onClick={() => openFolder(item.content)}
                                        onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                                        onMouseLeave={e => e.target.style.textDecoration = 'none'}
                                    >{getFileFolder(item.content)}</span>
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', opacity: 0.6, whiteSpace: 'nowrap' }}>{t('history.fileName')}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>{getFileName(item.content)}</span>
                                    <CopyButton text={getFileName(item.content)} />
                                </span>
                            </>
                        )}
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--outline-variant)', margin: '12px 0' }} />
                    <div style={{ maxHeight: '40vh', overflowY: 'auto', fontSize: '14px', lineHeight: 1.6, color: 'var(--on-surface)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.type === 2 ? t('history.noPreview') : item.content}</div>
                </div>
            ),
            buttons: [
                { label: 'common.button.confirm', value: true, primary: true },
            ],
        });
    };

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
            const records = await invoke('get_all_upload_history');
            const formattedRecords = records.map(record => ({
                id: record.id,
                type: record.action_type,
                time: record.created_at.replace(/-/g, '/'),
                ip: record.ip,
                content: record.content,
                isOverwrite: record.is_overwrite === 1
            }));
            setHistory(formattedRecords);
        } catch (error) {
            console.error('获取历史记录失败:', error);
        }
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

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

    const filteredHistory = history.filter(item => {
        if (activeFilter === "all") return item.type !== 3;
        if (activeFilter === "files") return item.type === 2 || item.type === 4;
        if (activeFilter === "text") return item.type === 1;
        return true;
    });

    const getTypeLabel = (type) => {
        if (type === 1 || type === 3) return t('history.type.text');
        return t('history.type.file');
    };

    const clearText = async () => {
        const confirmed = await showDialog({
            title: t('history.clearDialog.title'),
            content: t('history.clearDialog.contentText'),
            buttons: [
                {label: 'common.button.cancel', value: false},
                {label: t('history.clearDialog.buttonClear'), value: true, primary: true, danger: true},
            ],
        });
        if (!confirmed) return;
        let resultCount = await invoke("clear_sharing_text");
        showToast({message: t('history.toast.textCleared'), type: 'success'});
        loadHistory();
    }

    const clearFile = async () => {
        const confirmed = await showDialog({
            title: t('history.clearDialog.title'),
            content: t('history.clearDialog.contentFile'),
            buttons: [
                {label: 'common.button.cancel', value: false},
                {label: t('history.clearDialog.buttonClear'), value: true, primary: true, danger: true},
            ],
        });
        if (!confirmed) return;
        let resultCount = await invoke("clear_sharing_file");
        showToast({message: t('history.toast.fileCleared'), type: 'success'});
        loadHistory();
    }

    return (
        <HistoryStyle>
            <div className="page-header">
                <Typography variant="h4" fontSize="1.5rem" fontWeight={700}>{t('history.pageTitle')}</Typography>
                <Typography variant="body2" fontSize="0.82rem" color="var(--on-surface-variant)">{t('history.pageDesc')}</Typography>
            </div>

            <div className="header-actions">
                <div className="filter-tabs">
                    {["all", "files", "text"].map(filter => (
                        <button
                            key={filter}
                            className={"filter-tab" + (activeFilter === filter ? " active" : "")}
                            onClick={() => setActiveFilter(filter)}
                        >
                            {t(`history.filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`)}
                        </button>
                    ))}
                </div>
                <div className="clear-actions">
                    <Button variant="outlined" color="error" size="small" onClick={clearText}>{t('history.clearTextButton')}</Button>
                    <Button variant="outlined" color="error" size="small" onClick={clearFile}>{t('history.clearFileButton')}</Button>
                </div>
            </div>

            <div className="list-container" ref={historyContainerRef}>
                <div className="list-header">
                    <div>{t('history.tableHeader.type')}</div>
                    <div>{t('history.tableHeader.content')}</div>
                    <div className="item-size">{t('history.tableHeader.size') || 'Size'}</div>
                    <div className="item-ip">{t('history.tableHeader.sourceIp')}</div>
                    <div className="item-time">{t('history.tableHeader.time')}</div>
                </div>
                <div className="list-body">
                    {filteredHistory.map((item) => (
                        <div
                            className={"list-row" + (item.type === 2 && item.isOverwrite ? " row-error" : "")}
                            key={item.id}
                            onContextMenu={(e) => showContextMenu(e, item)}
                        >
                            <div className={"type-icon " + (item.type === 2 ? "file" : "text")}>
                                {item.type === 2 ? (
                                    <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                ) : (
                                    <svg viewBox="0 0 24 24"><path d="M5 5h14"/><path d="M12 5v15"/></svg>
                                )}
                            </div>
                            <div className="item-name">{item.content}</div>
                            <div className="item-size">{item.type === 2 ? (item.content ? item.content.length + 'B' : '-') : '-'}</div>
                            <div className="item-ip">{item.ip}</div>
                            <div className="item-time">{item.time}</div>
                        </div>
                    ))}
                </div>
            </div>

            {contextMenu.visible && contextMenu.item && (
                <div className="context-menu" ref={contextMenuRef} style={{ left: contextMenu.x, top: contextMenu.y }}>
                    <button className="context-menu-item" onClick={() => { viewDetail(contextMenu.item); hideContextMenu(); }}>
                        {t('history.contextMenu.viewDetail')}
                    </button>
                    {contextMenu.item.type === 1 && (
                        <button className="context-menu-item" onClick={() => { viewCopyRecords(contextMenu.item); hideContextMenu(); }}>
                            {t('history.contextMenu.viewCopyRecords')}
                        </button>
                    )}
                    {contextMenu.item.type === 2 && (
                        <button className="context-menu-item" onClick={() => { openFileLocation(contextMenu.item); hideContextMenu(); }}>
                            {t('history.contextMenu.openFileLocation')}
                        </button>
                    )}
                    <div className="context-menu-separator" />
                    <button className="context-menu-item" onClick={() => { copyToClipboard(contextMenu.item.content); hideContextMenu(); }}>
                        {contextMenu.item.type === 2 ? t('history.contextMenu.copyPath') : t('history.contextMenu.copyContent')}
                    </button>
                    <button className="context-menu-item" onClick={() => { copyToClipboard(contextMenu.item.ip); hideContextMenu(); }}>
                        {t('history.contextMenu.copyIp')}
                    </button>
                    <div className="context-menu-separator" />
                    <button className="context-menu-item danger" onClick={() => {
                        if (contextMenu.item.type === 1) deleteTextItem(contextMenu.item.id);
                        else deleteHistoryItem(contextMenu.item.id);
                    }}>
                        {t('history.contextMenu.deleteRecord')}
                    </button>
                </div>
            )}
        </HistoryStyle>
    );
}

export default History;
