import React, {useEffect, useRef, useState} from 'react';
import FileSharingStyle from "./FileSharingStyle.js";
import Card from "../Card/Card.js";
import {getFileSharingAPI, uploadFileAPI} from "../../service/API.js";
import {formatFileSize} from "../../util/file.js";

function FileSharing() {
    // 文件选择器元素
    const fileSelectorRef = useRef(null);
    // 被共享的文件列表
    const [sharedFileList, setSharedFileList] = useState([
        {is_dir: false, modified: "1658150371", name: "bootTel.dat", size: 1},
        {is_dir: false, modified: "1707631067", name: "BuildTools.exe", size: 6197565},
        {is_dir: true, modified: "1729437814", name: "APK", size: 0},
        {is_dir: false, modified: "1707631067", name: "测试.exe", size: 6197565}
    ]);

    // 将要上传的文件列表
    const [filesToUpload, setFilesToUpload] = useState([]);

    useEffect(() => {
        // 调接口取文件列表
        getFileSharingAPI().then(res => {
            if (res.code !== 200) {
                console.error("文件列表接口异常")
                return;
            }

            // 将列表按一定顺序排序
            const rl = res.data.sort((a, b) => {
                // 第一步：区分 true/false 组（true 在前）
                // true→1，false→0，b.dir - a.dir 确保 1 排在 0 前面
                const dirDiff = b.is_dir - a.is_dir;

                // 第二步：同组内按 name 排序
                if (dirDiff === 0) {
                    // localeCompare 确保字典序，sensitivity: "base" 忽略大小写
                    return a.name.localeCompare(b.name, undefined, {sensitivity: "base"});
                }

                return dirDiff;
            });
            // 存储文件
            setSharedFileList(rl);

        })

    }, []);

    const fileSelectorHandler = (e) => {
        const fileList = e.target.files;
        // 用户点击取消（也就是没选择文件）
        if (!fileList || fileList.length === 0) return;

        // 被选中的文件（FileList对象转数组）
        const files = Array.from(fileList);
        console.log(e, files);
        setFilesToUpload(files);

        // 清除input的选择（防止下次选择同一个文件不响应onChange）
        fileSelectorRef.current.value = '';

        files.forEach(v => {
            //TODO 进度条、二次确认

            // 文件Form表单
            let formData = new FormData();
            formData.append("file", v);
            // formData.append("sub_dir", "somTemp");
            uploadFileAPI(formData).then(res => {
                console.log("文件上传结果：", res);
            });
        })

    }

    return (
        <Card>
            <FileSharingStyle>
                <table className={"fileList"}>
                    <colgroup>
                        <col width={"40px"}/>
                        <col/>
                        {/*操作时间*/}
                        <col width={"15%"}/>
                        {/*大小*/}
                        <col width={"10%"}/>
                        {/*操作*/}
                        <col width={"25%"}/>
                    </colgroup>
                    <thead>
                    <tr>
                        <th></th>
                        <th>名称</th>
                        <th>修改时间</th>
                        <th>大小</th>
                        <th>操作</th>
                    </tr>
                    </thead>
                    <tbody>
                    {sharedFileList.map(v => {
                        return (
                            <tr className={"fileItem"}>
                                <td>{!v.is_dir && <input type={"checkbox"}/>}</td>
                                <td>{v.name}</td>
                                <td>{v.modified}</td>
                                <td>{!v.is_dir && formatFileSize(v.size, 1)}</td>
                                <td>
                                    <div className={!v.is_dir ? "fileActions" : "dirActions"}>
                                        <button>下载</button>
                                        <button>删除</button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>

                </table>

                <div className={"batchActions"}>
                    <input type={"file"}
                           multiple
                           onChange={fileSelectorHandler}
                           ref={fileSelectorRef}
                           style={{display: "none"}}/>
                    <button onClick={() => fileSelectorRef.current.click()}>上传文件</button>

                    <button>批量下载</button>
                </div>
            </FileSharingStyle>
        </Card>
    );
}

export default FileSharing;