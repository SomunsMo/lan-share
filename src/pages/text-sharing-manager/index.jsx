import React, {useState, useEffect, useRef, useCallback, useLayoutEffect} from 'react';
import TextSharingManagerStyle from "./style.js";
import copy from 'copy-to-clipboard';
import {invoke} from '@tauri-apps/api/core';
import {useTranslation} from "react-i18next";
import {useDialog} from "@/components/dialog/index.jsx";
import {useToast} from "@/components/toast/index.jsx";
import {calcMenuPosition} from "../../utils/menu.js";
import CopyButton from "../../components/copyButton/index.jsx";

function TextSharingManager(props) {
    const { t } = useTranslation();
    const {showDialog} = useDialog();
    const {showToast} = useToast();
    // 文本框内容
    const [textValue, setTextValue] = useState("");
    // 历史记录
    const [history, setHistory] = useState([]);

    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        item: null
    });
    const [menuVersion, setMenuVersion] = useState(0);
    // 创建ref来引用历史记录容器
    const historyContainerRef = useRef(null);
    const contextMenuRef = useRef(null);
    const mousePosRef = useRef({ x: 0, y: 0 });

    // 查看复制记录
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
                    <div style={{maxHeight: '50vh', overflowY: 'auto'}}>
                        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
                            <thead>
                                <tr style={{borderBottom: '2px solid var(--outline-variant)'}}>
                                    <th style={{padding: '6px 8px', textAlign: 'left', color: 'var(--on-surface-variant)', fontWeight: 600, width: '50px', whiteSpace: 'nowrap'}}>{t('history.copyRecordsSeq')}</th>
                                    <th style={{padding: '6px 8px', textAlign: 'left', color: 'var(--on-surface-variant)', fontWeight: 600}}>{t('history.tableHeader.time')}</th>
                                    <th style={{padding: '6px 8px', textAlign: 'left', color: 'var(--on-surface-variant)', fontWeight: 600}}>{t('history.tableHeader.sourceIp')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((r, i) => (
                                    <tr key={r.id} style={{borderBottom: '1px solid var(--outline-variant)'}}>
                                        <td style={{padding: '6px 8px', color: 'var(--on-surface-variant)'}}>{i + 1}</td>
                                        <td style={{padding: '6px 8px', color: 'var(--on-surface)'}}>{r.created_at.replace(/-/g, '/')}</td>
                                        <td style={{padding: '6px 8px', color: 'var(--on-surface)'}}>{r.ip}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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

    // 复制文本到剪贴板
    const copyToClipboard = useCallback((text) => {
        try {
            copy(text);
            console.log('文本已复制到剪贴板');
            // 可以添加提示信息
        } catch (err) {
            console.error('复制失败:', err);
        }
    }, []);

    // 删除历史记录项
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
            console.log('删除成功');
        } catch (error) {
            console.error('删除文本共享记录失败:', error);
        }
    }, [showDialog, t]);

    // 显示右键菜单
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

    // 渲染后测量实际尺寸，计算最终位置
    useLayoutEffect(() => {
        if (menuVersion === 0 || !contextMenu.visible || !contextMenuRef.current) return;
        const rect = contextMenuRef.current.getBoundingClientRect();
        const pos = calcMenuPosition(mousePosRef.current.x, mousePosRef.current.y, rect.width, rect.height);
        if (pos.x !== rect.left || pos.y !== rect.top) {
            setContextMenu(prev => ({ ...prev, x: pos.x, y: pos.y }));
        }
    }, [menuVersion]);

    // 隐藏右键菜单
    const hideContextMenu = useCallback(() => {
        setContextMenu({visible: false, x: 0, y: 0, item: null});
    }, []);

    // 加载历史记录
    const loadHistory = useCallback(async () => {
        try {
            const records = await invoke('get_text_sharing_history');
            // 将数据库记录转换为前端所需的格式
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

    // 初始化加载历史记录
    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // 通过Tauri分享文本到局域网
    const shareTextViaTauri = async () => {
        if (!textValue.trim()) {
            console.warn("文本内容为空，无法分享");
            return;
        }

        try {
            await invoke('share_text_to_lan', {textData: textValue});
            console.log("文本已通过Tauri分享到局域网");

            // 清空文本输入框
            setTextValue("");
            // 刷新历史列表
            loadHistory();
        } catch (error) {
            console.error("通过Tauri分享文本失败:", error);
        }
    }

    // 查看消息详情
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

    // 点击其他地方隐藏菜单
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
                <h1>{t('textSharing.pageTitle')}</h1>
                <p>{t('textSharing.pageDesc')}</p>
            </div>

            <div className="compose-panel">
                <textarea
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    placeholder={t('textSharing.placeholder')}
                />
                <div className="compose-footer">
                    <span className="char-count">{textValue.length} characters</span>
                    <div className="compose-actions">
                        <button className="btn-clear" onClick={() => setTextValue("")}>{t('textSharing.clearButton')}</button>
                        <button className="btn-share" onClick={shareTextViaTauri}>{t('textSharing.shareButton')}</button>
                    </div>
                </div>
            </div>

            <div className="history-section">
                <h2 className="history-title">{t('textSharing.recentTitle')}</h2>
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
                                <button
                                    className="card-action-btn card-action-copy"
                                    onClick={() => copyToClipboard(item.content)}
                                >
                                    {t('textSharing.copyButton')}
                                </button>
                                <button
                                    className="card-action-btn card-action-view"
                                    onClick={() => viewDetail(item)}
                                >
                                    {t('textSharing.viewButton')}
                                </button>
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