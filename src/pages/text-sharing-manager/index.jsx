import React, {useState, useEffect, useRef, useCallback} from 'react';
import TextSharingManagerStyle from "./style.js";
import Card from "../../components/card/Card.js";
import copy from 'copy-to-clipboard';
import {invoke} from '@tauri-apps/api/core';
import {useTranslation} from "react-i18next";

function TextSharingManager(props) {
    const { t } = useTranslation();
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
    // 创建ref来引用历史记录容器
    const historyContainerRef = useRef(null);

    // 滚动事件处理函数（带节流）
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

        // 初始检查
        handleScroll();

        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, []);

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
        try {
            await invoke('delete_text_sharing_record', {id: itemId});
            setHistory(prev => prev.filter(item => item.id !== itemId));
            setContextMenu({visible: false, x: 0, y: 0, item: null});
            console.log('删除成功');
        } catch (error) {
            console.error('删除文本共享记录失败:', error);
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
            <Card fillSpace>
                <textarea
                    className={"textEdit"}
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    placeholder={t('textSharing.placeholder')}
                />
                <div className={"textEditActions"}>
                    <button onClick={shareTextViaTauri}>{t('textSharing.shareButton')}</button>
                </div>
            </Card>
            <Card>
                <div className={"sharingHistory"} ref={historyContainerRef}>
                    <table className={`historyTable ${history.length > 0 ? 'sticky-shadow' : ''}`}>
                        <colgroup>
                            <col width={"40px"}/>
                            <col width={"170px"}/>
                            <col width={"150px"}/>
                            <col width={"auto"}/>
                        </colgroup>
                        <thead>
                        <tr>
                            <th></th>
                            <th title={t('textSharing.tableHeader.time')}>{t('textSharing.tableHeader.time')}</th>
                            <th title={t('textSharing.tableHeader.sourceIp')}>{t('textSharing.tableHeader.sourceIp')}</th>
                            <th title={t('textSharing.tableHeader.content')}>{t('textSharing.tableHeader.content')}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {
                            history.map((item, index) => (
                                <tr
                                    className="historyRow"
                                    key={item.id}
                                    onContextMenu={(e) => showContextMenu(e, item)}
                                >
                                    <td></td>
                                    <td className={"hisTime"}>{item.time}</td>
                                    <td className={"hisIp"}>{item.ip}</td>
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
                                left: contextMenu.x - 10,
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
                                {t('textSharing.contextMenu.copyContent')}
                            </div>
                            <div
                                className="context-menu-item"
                                onClick={() => deleteHistoryItem(contextMenu.item.id)}
                            >
                                {t('textSharing.contextMenu.deleteRecord')}
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </TextSharingManagerStyle>
    );
}

export default TextSharingManager;