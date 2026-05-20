import React, {useState, useEffect} from 'react';
import SettingsStyle from "./style.js";
import {invoke} from "@tauri-apps/api/core";
import {open} from '@tauri-apps/plugin-dialog';
import Card from "../../components/card/Card.js";

function Settings() {
    const [selectedDirectory, setSelectedDirectory] = useState("点击选择目录");
    const [uploadEnabled, setUploadEnabled] = useState(false); // 默认禁止上传

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
                // 出错时默认启用上传
                setUploadEnabled(true);
            }
        };

        fetchCurrentDirectory();
        fetchUploadSetting();
    }, []); // 只在组件挂载时获取，但我们也会在selectDirectory函数中更新状态


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
            // 如果保存失败，恢复之前的值
            setUploadEnabled(!checked);
            alert('保存上传设置失败: ' + error.message);
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
                            checked={uploadEnabled}
                            onChange={handleUploadChange}
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
                    name: "客户端上传文件",
                    content: (
                        <input
                            type="checkbox"
                            checked={uploadEnabled}
                            onChange={handleUploadChange}
                        />
                    ),
                },
                {
                    name: "客户端重命名文件",
                    content: (
                        <input
                            type="checkbox"
                            checked={uploadEnabled}
                            onChange={handleUploadChange}
                        />
                    ),
                },
                {
                    name: "客户端删除文件",
                    content: (
                        <input
                            type="checkbox"
                            checked={uploadEnabled}
                            onChange={handleUploadChange}
                        />
                    ),
                }
            ]
        }, {
            name: "数据清理",
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