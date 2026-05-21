import React, {useState, useEffect} from 'react';
import SettingsStyle from "./style.js";
import {invoke} from "@tauri-apps/api/core";
import {open} from '@tauri-apps/plugin-dialog';
import Card from "../../components/card/Card.js";
import {useToast} from "../../components/toast/index.jsx";
import {useDialog} from "../../components/dialog/index.jsx";

function Settings() {
    const [selectedDirectory, setSelectedDirectory] = useState("点击选择目录");
    const [uploadEnabled, setUploadEnabled] = useState(false);
    const [renameEnabled, setRenameEnabled] = useState(false);
    const [deleteEnabled, setDeleteEnabled] = useState(false);
    const [uploadOverwriteEnabled, setUploadOverwriteEnabled] = useState(false);
    const [autostartEnabled, setAutostartEnabled] = useState(false);
    const [httpPort, setHttpPort] = useState(3000);
    const {showToast} = useToast();
    const {showDialog} = useDialog();

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

        const fetchUploadOverwriteSetting = async () => {
            try {
                const enabled = await invoke('get_upload_overwrite_enabled');
                console.log('当前上传覆盖设置是:', enabled);
                setUploadOverwriteEnabled(enabled);
            } catch (error) {
                console.error('获取上传覆盖设置失败:', error);
                setUploadOverwriteEnabled(false);
            }
        };

        fetchUploadOverwriteSetting();

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

        const fetchHttpPort = async () => {
            try {
                const port = await invoke('get_http_port');
                console.log('当前HTTP端口设置是:', port);
                setHttpPort(port);
            } catch (error) {
                console.error('获取HTTP端口设置失败:', error);
                setHttpPort(3000);
            }
        };

        fetchHttpPort();
    }, []);


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
        let resultCount = invoke("clear_sharing_text");
        console.log("清空共享文本成功：", resultCount);
        showToast({message: '文本记录已清空', type: 'success'});
    }

    // 处理端口变更（点击后弹出输入框）
    const handlePortClick = async () => {
        const input = await showDialog({
            title: '修改端口',
            content: '请输入新的端口号（1-65535）：',
            input: {defaultValue: httpPort.toString(), placeholder: '1-65535'},
        });
        if (input === null || input === undefined) return; // 用户取消

        const newPort = parseInt(input, 10);
        if (isNaN(newPort) || newPort < 1 || newPort > 65535) {
            showToast({message: '端口号无效，请输入 1-65535 之间的数字', type: 'error'});
            return;
        }

        if (newPort === httpPort) return; // 端口未变化

        try {
            await invoke('set_http_port', {port: newPort});
            setHttpPort(newPort);
            console.log('HTTP端口设置已更新:', newPort);
            showToast({message: '端口设置已保存，重启应用后生效', type: 'success'});
        } catch (error) {
            console.error('保存HTTP端口设置失败:', error);
            showToast({message: '保存端口设置失败: ' + error, type: 'error'});
        }
    };

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
                    showToast({message: '保存设置失败: ' + backendError.message, type: 'error'});
                }
            }
        } catch (error) {
            console.error('选择文件夹时出错:', error);
            showToast({message: '选择文件夹失败: ' + error.message, type: 'error'});
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
            showToast({message: '保存上传设置失败: ' + error.message, type: 'error'});
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
            showToast({message: '保存重命名设置失败: ' + error.message, type: 'error'});
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
            showToast({message: '保存删除设置失败: ' + error.message, type: 'error'});
        }
    };

    // 处理上传覆盖设置变更
    const handleUploadOverwriteChange = async (event) => {
        const checked = event.target.checked;
        setUploadOverwriteEnabled(checked);

        try {
            await invoke('set_upload_overwrite_enabled', {enabled: checked});
            console.log('上传覆盖设置已更新:', checked);
        } catch (error) {
            console.error('保存上传覆盖设置失败:', error);
            setUploadOverwriteEnabled(!checked);
            showToast({message: '保存上传覆盖设置失败: ' + error.message, type: 'error'});
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
            showToast({message: '保存开机自启设置失败: ' + error.message, type: 'error'});
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
                    content: (
                        <span
                            className="port-text"
                            onClick={handlePortClick}
                            title="点击修改端口"
                        >
                            {httpPort}
                        </span>
                    ),
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
                    name: "上传可覆盖",
                    content: (
                        <input
                            type="checkbox"
                            checked={uploadOverwriteEnabled}
                            onChange={handleUploadOverwriteChange}
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
                    content: <button className={"clear-text"} onClick={async () => {
                        const confirmed = await showDialog({
                            title: '确认清空',
                            content: '确定要清空所有文件记录吗？此操作不可撤销。',
                            buttons: [
                                {label: '取消', value: false},
                                {label: '清空', value: true, primary: true, danger: true},
                            ],
                        });
                        if (confirmed) {
                            console.log('清空文件记录（功能待实现）');
                        }
                    }}>清空</button>,
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