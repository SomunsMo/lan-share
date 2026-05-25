import React, {useState, useEffect, useRef, useCallback} from 'react';
import HistoryStyle from "./style.js";
import Card from "../../components/card/Card.js";
import copy from 'copy-to-clipboard';
import {invoke} from '@tauri-apps/api/core';
import {useToast} from "../../components/toast/index.jsx";
import {useDialog} from "../../components/dialog/index.jsx";

function History() {
    const [history, setHistory] = useState([]);
    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        item: null
    });
    const historyContainerRef = useRef(null);
    const {showToast} = useToast();
    const {showDialog} = useDialog();

    // 滚动事件处理函数
    useEffect(() => {
        const container = historyContainerRef.current;
        if (!container) return;

        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const tableElement = container.querySelector('.historyTable');
                    if (tableElement && container.scrollTop > 0) {
                        tableElement.classList.add('sticky-shadow');
                    } else {
                        tableElement?.classList.remove('sticky-shadow');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };

        container.addEventListener('scroll', handleScroll);
        handleScroll();

        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // 复制文本到剪贴板
    const copyToClipboard = useCallback((text) => {
        try {
            copy(text);
        } catch (err) {
            console.error('复制失败:', err);
        }
    }, []);

    // 删除历史记录项
    const deleteHistoryItem = useCallback(async (itemId) => {
        try {
            await invoke('delete_file_sharing_record', {id: itemId});
            setHistory(prev => prev.filter(item => item.id !== itemId));
            setContextMenu({visible: false, x: 0, y: 0, item: null});
        } catch (error) {
            console.error('删除记录失败:', error);
        }
    }, []);

    // 删除文本记录
    const deleteTextItem = useCallback(async (itemId) => {
        try {
            await invoke('delete_text_sharing_record', {id: itemId});
            setHistory(prev => prev.filter(item => item.id !== itemId));
            setContextMenu({visible: false, x: 0, y: 0, item: null});
        } catch (error) {
            console.error('删除记录失败:', error);
        }
    }, []);

    // 显示右键菜单
    const showContextMenu = useCallback((e, item) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            item: item
        });
    }, []);

    // 隐藏右键菜单
    const hideContextMenu = useCallback(() => {
        setContextMenu({visible: false, x: 0, y: 0, item: null});
    }, []);

    // 加载所有历史记录
    const loadHistory = useCallback(async () => {
        try {
            const records = await invoke('get_all_upload_history');
            const formattedRecords = records.map(record => ({
                id: record.id,
                type: record.upload_type,
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

    // 初始化加载历史记录
    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

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

    const getTypeLabel = (type) => {
        return type === 1 ? '文本' : '文件';
    };

    // 清空文本记录
    const clearText = async () => {
        const confirmed = await showDialog({
            title: '确认清空',
            content: '确定要清空所有文本记录吗？此操作不可撤销。',
            buttons: [
                {label: '取消', value: false},
                {label: '清空', value: true, primary: true, danger: true},
            ],
        });
        if (!confirmed) return;
        let resultCount = await invoke("clear_sharing_text");
        console.log("清空共享文本成功：", resultCount);
        showToast({message: '文本记录已清空', type: 'success'});
        loadHistory();
    }

    // 清空文件记录
    const clearFile = async () => {
        const confirmed = await showDialog({
            title: '确认清空',
            content: '确定要清空所有文件记录吗？此操作不可撤销。',
            buttons: [
                {label: '取消', value: false},
                {label: '清空', value: true, primary: true, danger: true},
            ],
        });
        if (!confirmed) return;
        let resultCount = await invoke("clear_sharing_file");
        console.log("清空文件上传记录成功：", resultCount);
        showToast({message: '文件记录已清空', type: 'success'});
        loadHistory();
    }

    return (
        <HistoryStyle>
            <Card fillSpace>
                <div className={"toolbar"}>
                    <button className={"clear-btn"} onClick={clearText}>清空文本记录</button>
                    <button className={"clear-btn"} onClick={clearFile}>清空文件记录</button>
                </div>
                <div className={"historyContainer"} ref={historyContainerRef}>
                    <table className={`historyTable ${history.length > 0 ? 'sticky-shadow' : ''}`}>
                        <colgroup>
                            <col width={"50px"}/>
                            <col width={"170px"}/>
                            <col width={"130px"}/>
                            <col width={"80px"}/>
                            <col width={"auto"}/>
                        </colgroup>
                        <thead>
                        <tr>
                            <th>类型</th>
                            <th>时间</th>
                            <th>来源IP</th>
                            <th>覆盖</th>
                            <th>内容</th>
                        </tr>
                        </thead>
                        <tbody>
                        {
                            history.map((item) => (
                                <tr
                                    className="historyRow"
                                    key={item.id}
                                    onContextMenu={(e) => showContextMenu(e, item)}
                                >
                                    <td className={"hisType"}>{getTypeLabel(item.type)}</td>
                                    <td className={"hisTime"}>{item.time}</td>
                                    <td className={"hisIp"}>{item.ip}</td>
                                    <td className={"hisOverwrite"}>
                                        {item.type === 2 ? (item.isOverwrite ? '是' : '否') : '-'}
                                    </td>
                                    <td className={"hisContent"}>{item.content}</td>
                                </tr>
                            ))
                        }
                        </tbody>
                    </table>

                    {/* 右键菜单 */}
                    {contextMenu.visible && contextMenu.item && (
                        <div
                            className="context-menu"
                            style={{
                                left: contextMenu.x,
                                top: contextMenu.y,
                            }}
                        >
                            <div
                                className="context-menu-item"
                                onClick={() => {
                                    copyToClipboard(contextMenu.item.content);
                                    setContextMenu({visible: false, x: 0, y: 0, item: null});
                                }}
                            >
                                复制内容
                            </div>
                            <div
                                className="context-menu-item"
                                onClick={() => {
                                    if (contextMenu.item.type === 1) {
                                        deleteTextItem(contextMenu.item.id);
                                    } else {
                                        deleteHistoryItem(contextMenu.item.id);
                                    }
                                }}
                            >
                                删除记录
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </HistoryStyle>
    );
}

export default History;
