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
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const historyContainerRef = useRef(null);
    const listBodyRef = useRef(null);
    const contextMenuRef = useRef(null);
    const mousePosRef = useRef({ x: 0, y: 0 });
    const cursorIdRef = useRef(null);
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
                                    <TableCell sx={{ fontWeight: 600, color: 'var(--on-surface-variant)', width: 50, whiteSpace: 'nowrap' }}>{t('history.copyRecordsSeq')}</TableCell>
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

    const formatRecord = (record) => ({
        id: record.id,
        type: record.action_type,
        time: record.created_at.replace(/-/g, '/'),
        ip: record.ip,
        content: record.content,
        isOverwrite: record.is_overwrite === 1
    });

    const getActionTypes = (filter) => {
        if (filter === 'files') return [2, 4];
        if (filter === 'text') return [1];
        return [1, 2, 4];
    };

    // 搜索防抖
    const [debouncedQuery, setDebouncedQuery] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const loadPage = useCallback(async (reset = false) => {
        if (loading) return;
        if (!reset && !hasMore) return;

        setLoading(true);
        const currentCursorId = reset ? null : cursorIdRef.current;

        try {
            const result = await invoke('get_transfer_log', {
                cursorId: currentCursorId,
                limit: 20,
                search: debouncedQuery || null,
                sortOrder,
                actionTypes: getActionTypes(activeFilter),
            });

            const newRecords = (result.records || []).map(formatRecord);
            if (reset) {
                setHistory(newRecords);
            } else {
                setHistory(prev => [...prev, ...newRecords]);
            }
            cursorIdRef.current = newRecords.length > 0 ? newRecords[newRecords.length - 1].id : null;
            setHasMore(result.has_more);
        } catch (error) {
            console.error('获取历史记录失败:', error);
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, debouncedQuery, sortOrder, activeFilter]);

    // 搜索/排序/过滤变化时重置分页
    useEffect(() => {
        cursorIdRef.current = null;
        setHasMore(true);
        setLoading(false);
        loadPage(true);
    }, [debouncedQuery, sortOrder, activeFilter]);

    // 滚动加载
    const handleScroll = useCallback(() => {
        const el = listBodyRef.current;
        if (!el || loading || !hasMore) return;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
            loadPage(false);
        }
    }, [loading, hasMore, loadPage]);

    useEffect(() => {
        const el = listBodyRef.current;
        if (!el) return;
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

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

    const getTypeLabel = (type) => {
        if (type === 1) return t('history.type.text');
        return t('history.type.file');
    };

    const getTypeLabelKey = (type) => {
        switch (type) {
            case 1: return 'history.typeLabel.text';
            case 2: return 'history.typeLabel.upload';
            case 4: return 'history.typeLabel.download';
            default: return 'history.typeLabel.text';
        }
    };

    const getTypeIconClass = (type) => {
        switch (type) {
            case 1: return 'text';
            case 2: return 'upload';
            case 4: return 'download';
            default: return 'text';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 1:
                return <svg viewBox="0 0 24 24"><path d="M5 5h14"/><path d="M12 5v15"/></svg>;
            case 2:
                return <svg viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
            case 4:
                return <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
            default:
                return <svg viewBox="0 0 24 24"><path d="M5 5h14"/><path d="M12 5v15"/></svg>;
        }
    };

    const handleSortToggle = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    return (
        <HistoryStyle>
            <div className="page-header">
                <Typography variant="h4" sx={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--on-surface)' }}>{t('history.pageTitle')}</Typography>
                <Typography variant="body2" fontSize="1.125rem" sx={{ color: 'var(--on-surface-variant)' }}>{t('history.pageDesc')}</Typography>
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
                <div className="search-box">
                    <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t('history.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <svg className="search-clear" viewBox="0 0 24 24" width="16" height="16" onClick={() => setSearchQuery('')}>
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    )}
                </div>
            </div>

            <div className="list-container" ref={historyContainerRef}>
                <div className="list-header">
                    <div>{t('history.tableHeader.type')}</div>
                    <div>{t('history.tableHeader.content')}</div>
                    <div></div>
                    <div className="item-time sortable" onClick={handleSortToggle}>
                        {t('history.tableHeader.time')}
                        <span className="sort-indicator">{sortOrder === 'desc' ? ' ↓' : ' ↑'}</span>
                    </div>
                </div>
                <div className="list-body" ref={listBodyRef}>
                    {history.map((item) => (
                        <div
                            className="list-row"
                            key={item.id}
                            onContextMenu={(e) => showContextMenu(e, item)}
                        >
                            <div className={"type-icon " + getTypeIconClass(item.type)} title={t(getTypeLabelKey(item.type))}>
                                {getTypeIcon(item.type)}
                            </div>
                            <div className="item-name">{item.content}</div>
                            <div className="item-tags">
                                <span className="item-tag ip" title={t('history.tagTooltip.ip')}>{item.ip}</span>
                                {item.type === 2 && (
                                    <span className="item-tag size" title={t('history.tagTooltip.size')}>{item.content ? item.content.length + 'B' : '-'}</span>
                                )}
                                {item.type === 2 && item.isOverwrite && (
                                    <span className="item-tag overwrite" title={t('history.tagTooltip.overwrite')}>{t('history.tag.overwriteYes')}</span>
                                )}
                            </div>
                            <div className="item-time">{item.time}</div>
                        </div>
                    ))}
                    {loading && (
                        <div className="list-loading">{t('common.loading') || 'Loading...'}</div>
                    )}
                    {!hasMore && history.length > 0 && (
                        <div className="list-loading list-end">{t('history.noMoreRecords') || 'No more records'}</div>
                    )}
                    {!loading && history.length === 0 && (
                        <div className="list-loading list-empty">{t('history.noSearchResults')}</div>
                    )}
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
