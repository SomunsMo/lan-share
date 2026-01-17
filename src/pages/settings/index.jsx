import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import SettingsStyle from "./style.js";
import {invoke} from "@tauri-apps/api/core";
import Card from "../../components/card/Card.js";

function Settings() {

    const clearText = () => {
        let resultCount = invoke("clear_sharing_text");
        console.log("清空共享文本成功：", resultCount);
    }

    // 使用 react-dropzone 实现拖拽文件夹功能
    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            
            // 检查是否是通过拖拽文件夹方式添加的文件
            if (file.webkitRelativePath) { 
                // 从 webkitRelativePath 提取文件夹路径
                const relativePath = file.webkitRelativePath;
                const folderName = relativePath.split('/')[0];
                console.log('拖拽的文件夹:', folderName);
                
                alert(`已选择文件夹: ${folderName}`);
            } else {
                alert('请拖拽整个文件夹，而不是单个文件');
            }
        }
    }, []);

    const {getRootProps, getInputProps, isDragActive} = useDropzone({
        onDrop,
        noClick: true,  // 禁用点击选择，因为我们有自己的按钮
        noKeyboard: true,  // 禁用键盘操作
        webkitdirectory: true, // 启用文件夹选择
        multiple: false
    });

    const selectDirectory = () => {
        // 点击按钮时触发文件输入
        document.querySelector('#folder-selector input').click();
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
                },
                {
                    name: "共享根目录",
                    // content: <input type="text" value={"F:/"}/>,
                    content: (
                        <div id="folder-selector">
                            <div {...getRootProps()} style={{ padding: '10px 0' }}>
                                <input {...getInputProps()} />
                                <button onClick={selectDirectory}>点击选择目录</button>
                                <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                                    {isDragActive ? "释放文件以选择文件夹" : "或将文件夹拖拽到这里"}
                                </div>
                            </div>
                        </div>
                    ),
                },
                {
                    name: "是否可上传文件",
                    content: <input type="checkbox"/>,
                }
            ]
        },
        {
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