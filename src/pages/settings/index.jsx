import React, {useState, useEffect} from 'react';
import SettingsStyle from "./style.js";
import {invoke} from "@tauri-apps/api/core";
import {open} from '@tauri-apps/plugin-dialog';
import Card from "../../components/card/Card.js";

function Settings() {
    const [selectedDirectory, setSelectedDirectory] = useState("点击选择目录");
    const [uploadEnabled, setUploadEnabled] = useState(false);
    const [renameEnabled, setRenameEnabled] = useState(false);
    const [deleteEnabled, setDeleteEnabled] = useState(false);
    const [autostartEnabled, setAutostartEnabled] = useState(false);

    // 每次组件渲染时获取当前共享目录和上传设置
    useEffect(() => {
        const fetchCurrentDirectory = async () => {
            try {
                const currentDir = await invoke('get_sharing_directory');
                console.log('当前共享目录是:', currentDir);
                setSelectedDirectory(currentDir);
            } catch (error) {
                console.error('获取当前共享目录失败:', error);
            }
        };

        const fetchUploadSetting = async () => {
            try {
                const enabled = await invoke('get_upload_enabled');
                console.log('当前上传设置是:', enabled);
                setUploadEnabled(enabled);
            } catch (error) {
                console.error('获取上传设置失败:', error);
                setUploadEnabled(false);
            }
        };

        const fetchRenameSetting = async () => {
            try {
                const enabled = await invoke('get_rename_enabled');
                console.log('当前重命名设置是:', enabled);
                setRenameEnabled(enabled);
            } catch (error) {
                console.error('获取重命名设置失败:', error);
                setRenameEnabled(false);
            }
        };

        const fetchDeleteSetting = async () => {
            try {
                const enabled = await invoke('get_delete_enabled');
                console.log('当前删除设置是:', enabled);
                setDeleteEnabled(enabled);
            } catch (error) {
                console.error('获取删除设置失败:', error);
                setDeleteEnabled(false);
            }
        };

        fetchCurrentDirectory();
        fetchUploadSetting();
        fetchRenameSetting();
        fetchDeleteSetting();

        const fetchAutostartSetting = async () => {
            try {
                const enabled = await invoke('get_autostart');
                console.log('当前开机自启设置是:', enabled);
                setAutostartEnabled(enabled);
            } catch (error) {
                console.error('获取开机自启设置失败:', error);
                setAutostartEnabled(false);
            }
        };

        fetchAutostartSetting();
    }, []);


    const clearText = () => {
        let resultCount = invoke("clear_sharing_text");
        console.log("清空共享文本成功：", resultCount);
    }

    const selectDirectory = async () => {
        try {
            const selectedPath = await open({
                directory: true,
                multiple: false,
                title: '选择共享根目录'
            });

            if (selectedPath) {
                setSelectedDirectory(selectedPath);
                console.log('已选择文件夹:', selectedPath);

                try {
                    // 调用后端API保存设置
                    await invoke('set_sharing_directory', {directoryPath: selectedPath});
                } catch (backendError) {
                    console.error('保存共享根目录到后端失败:', backendError);
                    alert('保存设置失败: ' + backendError.message);
                }
            }
        } catch (error) {
            console.error('选择文件夹时出错:', error);
            alert('选择文件夹失败: ' + error.message);
        }
    };

    // 处理上传设置变更
    const handleUploadChange = async (event) => {
        const checked = event.target.checked;
        setUploadEnabled(checked);

        try {
            await invoke('set_upload_enabled', {enabled: checked});
            console.log('上传设置已更新:', checked);
        } catch (error) {
            console.error('保存上传设置失败:', error);
            setUploadEnabled(!checked);
            alert('保存上传设置失败: ' + error.message);
        }
    };

    // 处理重命名设置变更
    const handleRenameChange = async (event) => {
        const checked = event.target.checked;
        setRenameEnabled(checked);

        try {
            await invoke('set_rename_enabled', {enabled: checked});
            console.log('重命名设置已更新:', checked);
        } catch (error) {
            console.error('保存重命名设置失败:', error);
            setRenameEnabled(!checked);
            alert('保存重命名设置失败: ' + error.message);
        }
    };

    // 处理删除设置变更
    const handleDeleteChange = async (event) => {
        const checked = event.target.checked;
        setDeleteEnabled(checked);

        try {
            await invoke('set_delete_enabled', {enabled: checked});
            console.log('删除设置已更新:', checked);
        } catch (error) {
            console.error('保存删除设置失败:', error);
            setDeleteEnabled(!checked);
            alert('保存删除设置失败: ' + error.message);
        }
    };

    // 处理开机自启变更
    const handleAutostartChange = async (event) => {
        const checked = event.target.checked;
        setAutostartEnabled(checked);

        try {
            await invoke('set_autostart', {enabled: checked});
            console.log('开机自启设置已更新:', checked);
        } catch (error) {
            console.error('保存开机自启设置失败:', error);
            setAutostartEnabled(!checked);
            alert('保存开机自启设置失败: ' + error.message);
        }
    };

    // ========================================

    // 设置的选项关系表
    const optionMap = [
        {
            name: "基础",
            options: [
                {
                    name: "Http Server端口",
                    content: <input type="number" value={3000}/>,
                }, {
                    name: "开机自启",
                    content: (
                        <input
                            type="checkbox"
                            checked={autostartEnabled}
                            onChange={handleAutostartChange}
                        />
                    ),
                },
            ]
        },
        {
            name: "共享",
            options: [
                {
                    name: "共享根目录",
                    // content: <input type="text" value={"F:/"}/>,
                    content: (
                        <span
                            className="directory-text"
                            onClick={selectDirectory}
                            title="点击更改目录"
                        >
                              {selectedDirectory}
                        </span>
                    ),
                },
                {
                    name: "网页端上传",
                    content: (
                        <input
                            type="checkbox"
                            checked={uploadEnabled}
                            onChange={handleUploadChange}
                        />
                    ),
                },
                {
                    name: "网页端重命名",
                    content: (
                        <input
                            type="checkbox"
                            checked={renameEnabled}
                            onChange={handleRenameChange}
                        />
                    ),
                },
                {
                    name: "网页端删除",
                    content: (
                        <input
                            type="checkbox"
                            checked={deleteEnabled}
                            onChange={handleDeleteChange}
                        />
                    ),
                }
            ]
        }, {
            name: "数据清除",
            options: [
                {
                    name: "文本记录",
                    content: <button className={"clear-text"} onClick={clearText}>清空</button>,
                },
                {
                    name: "文件记录",
                    content: <button className={"clear-text"}>清空</button>,
                }
            ]
        },
        {
            name: "主题",
            options: [
                {
                    name: "暗色模式",
                    content: <input type="checkbox"/>,
                },
                {
                    name: "主题色",
                    content: <input type="color"/>,
                }
            ]
        }

    ];

    return (
        <SettingsStyle>
            {optionMap.map(v => {
                return (
                    <Card>
                        <h3 className={"block-title"}>{v.name}</h3>
                        <table className={"options-table"}>
                            <colgroup>
                                <col width={"61.8%"}/>
                                <col/>
                            </colgroup>
                            <tbody>
                            {v.options.map(v => {
                                return (
                                    <tr>
                                        <td>
                                            {v.name}
                                        </td>
                                        <td className={"table-value"}>
                                            {v.content}
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </Card>
                )
            })}
        </SettingsStyle>
    );
}

export default Settings;