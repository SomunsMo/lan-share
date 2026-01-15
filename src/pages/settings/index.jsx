import React from 'react';
import SettingsStyle from "./style.js";
import {invoke} from "@tauri-apps/api/core";
import Card from "../../components/card/Card.js";


function Settings() {

    const clearText = () => {
        let resultCount = invoke("clear_sharing_text");
        console.log("清空共享文本成功：", resultCount);
    }


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
                    content: <input type="text" value={"F:/"}/>,
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