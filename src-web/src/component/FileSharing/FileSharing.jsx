import React, {useEffect, useRef, useState} from 'react';
import FileSharingStyle from "./FileSharingStyle.js";
import Card from "../Card/Card.js";
import {getFileSharingAPI, uploadFileAPI} from "@/service/API.js";
import {formatFileSize, getFileSuffix} from "@/util/file.js";
import FolderIcon from '@/assets/icon/folder.svg';
import CodeIcon from '@/assets/icon/code.svg';
import DocIcon from '@/assets/icon/doc.svg';
import FileIcon from '@/assets/icon/file.svg';
import MusicIcon from '@/assets/icon/music.svg';
import PdfIcon from '@/assets/icon/pdf.svg';
import PictureIcon from '@/assets/icon/picture.svg';
import VideoIcon from '@/assets/icon/video.svg';
import ZipIcon from '@/assets/icon/zip.svg';


// 文件类型枚举
const FILE_TYPE = {
    folder: "folder",
    img: "img",
    audio: "audio",
    video: "video",
    doc: "doc",
    pdf: "pdf",
    zip: "zip",
    exe: "exe",
    normal: "normal",
}


// 根据文件类型获取对应的图标
const getTypeIcon = (type) => {
    let iconPath;
    switch (type) {
        case FILE_TYPE.folder:
            iconPath = FolderIcon;
            break;
        case FILE_TYPE.img:
            iconPath = PictureIcon;
            break;
        case FILE_TYPE.audio:
            iconPath = MusicIcon;
            break;
        case FILE_TYPE.video:
            iconPath = VideoIcon;
            break;
        case FILE_TYPE.doc:
            iconPath = DocIcon;
            break;
        case FILE_TYPE.pdf:
            iconPath = PdfIcon;
            break;
        case FILE_TYPE.zip:
            iconPath = ZipIcon;
            break;
        case FILE_TYPE.exe:
            iconPath = CodeIcon;
            break;
        default:
            iconPath = FileIcon;
    }

    return <img className={"iconImg"} src={iconPath} alt={null}/>;
}

const fileTypeMap = new Map([
    [FILE_TYPE.img, new Set(["bmp", "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "tiff", "psd", "ai", "eps", "raw"])],
    [FILE_TYPE.audio, new Set(["ogg", "mp3", "wav", "flac", "aac", "m4a", "wma", "ape", "opus"])],
    [FILE_TYPE.video, new Set(["mp4", "mkv", "wmv", "avi", "mov", "flv", "webm", "mpg", "mpeg", "m4v", "m2v", "m4p", "m4b", "m4r", "3gp", "3g2", "f4v", "f4p", "f4a", "f4b"])],
    [FILE_TYPE.doc, new Set(["txt", "doc", "docx", "rtf", "odt", "xls", "xlsx", "ppt", "pptx", "csv", "md", "html", "htm", "xml", "json", "yaml", "yml"])],
    [FILE_TYPE.pdf, new Set(["pdf"])],
    [FILE_TYPE.zip, new Set(["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "z", "jar", "war", "rar4", "iso", "dmg"])],
    [FILE_TYPE.exe, new Set(["exe", "msi", "app", "deb", "rpm", "apk", "ipa", "bat", "sh", "cmd", "ps1"])],
    [FILE_TYPE.code, new Set(["js", "ts", "jsx", "tsx", "py", "java", "cpp", "c", "h", "cs", "php", "rb", "go", "sql", "swift", "kt", "rs", "dart", "lua", "perl", "r", "css", "scss", "sass", "less", "vue", "svelte"])],
    [FILE_TYPE.config, new Set(["ini", "cfg", "conf", "config", "env", "log", "toml", "lock"])],
]);

// 根据文件后缀返回对应的图标
const getFileIcon = (suffix) => {
    let fileType = null;
    for (let entry of fileTypeMap.entries()) {
        const [type, suffixSet] = entry;
        if (suffixSet.has(suffix)) {
            fileType = type;
        }
    }

    return getTypeIcon(fileType);
};

function FileSharing() {
    // 文件选择器元素
    const fileSelectorRef = useRef(null);
    // 被共享的文件列表
    const [sharedFileList, setSharedFileList] = useState([
        {is_dir: true, modified: "1729437814", name: "TestFolder", size: 0},
        {is_dir: false, modified: "1658150371", name: "test.txt", size: 1},
    ]);

    // 将要上传的文件列表
    const [filesToUpload, setFilesToUpload] = useState([]);

    const preprocessSharedFileList = (sfl) => {
        sfl.forEach(v => {
            if (v.is_dir) {
                v.size = "-";
                v.suffix = "/folder";
                v.icon = getTypeIcon(FILE_TYPE.folder);
            } else {
                v.suffix = getFileSuffix(v.name);
                v.icon = getFileIcon(v.suffix);
            }
        });

        // 将列表按一定顺序排序
        const rl = sfl.sort((a, b) => {
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

        setSharedFileList(rl);
    }

    // 获取当前在哪个文件夹
    const getCurrentDir = () => {
        //从url param中获取
        return new URLSearchParams(window.location.search).get("dir");
    }

    // 调用接口，获取并更新文件列表
    const flushSharedFileList = async (dir) => {
        try {
            const res = await getFileSharingAPI(dir);
            if (res.code !== 200) {
                console.error("获取文件列表异常");
                return false;
            }

            let data = res.data;
            preprocessSharedFileList(data);
            return true;
        } catch (error) {
            console.error("获取文件列表异常", error);
            return false;
        }
    }

    useEffect(() => {

        let currentDir = getCurrentDir();
        // 调接口取文件列表
        flushSharedFileList(currentDir ? currentDir : "");

        preprocessSharedFileList([
            {
                is_dir: false,
                modified: "2025/01/01 00:00:00",
                name: "bootTel_0000000000000000000000000000000000.dat",
                size: 1
            },
            {is_dir: false, modified: "2025/01/01 00:00:00", name: "BuildTools.exe", size: 6197565},
            {is_dir: true, modified: "2025/01/01 00:00:00", name: "APK", size: 0},
            {is_dir: false, modified: "2025/01/01 00:00:00", name: "测试.exe", size: 6197565}
        ])

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

    const itemDoubleClickHandler = async (item) => {
        console.log(item);
        if (!item || !item.is_dir) {
            return;
        }

        // 说明要打开该文件夹
        const currentDir = getCurrentDir();
        console.log("当前路径", currentDir)

        // 当前文件夹路径 + 要访问的文件夹
        const newDir = currentDir ? `${currentDir}/${item.name}` : item.name;
        console.log("新路径：", newDir);

        // 请求要访问的文件夹路径，若请求成功。则更新url的dir
        if (await flushSharedFileList(newDir)) {
            console.log("写入新路径");
            // 向url写入参数，但不刷新页面
            window.history.pushState(null, null, `?dir=${newDir}`);
        } else {
            console.error("请求新文件夹失败");
        }
    }

    // 下载文件
    const downloadFile = async (v) => {
        // 获取当前目录
        const currentDir = getCurrentDir();

        try {
            // 构造下载URL，直接跳转到下载地址
            const downloadUrl = `/download/file?dir=${currentDir ? currentDir : ''}&file_name=${encodeURIComponent(v.name)}`;

            // 使用window.open打开下载链接，让浏览器原生处理下载
            // 这样可以让第三方下载工具接管下载
            window.open(downloadUrl, '_blank');
        } catch (error) {
            console.error('文件下载失败:', error);
            alert('文件下载失败: ' + (error.message || '未知错误'));
        }
    }

    return (
        <Card>
            <FileSharingStyle>
                <div className={"fileList"}>
                    <table className={"fileTable"}>
                        <colgroup>
                            <col width={"40px"}/>
                            <col width="45%"/>
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
                        {sharedFileList.map((v, i) => {
                            return (
                                <tr className={"fileItem"} key={v.name + i}
                                    onDoubleClick={() => itemDoubleClickHandler(v)}>
                                    <td>
                                        <div className={"checkbox"}>{!v.is_dir && <input type={"checkbox"}/>}</div>
                                    </td>
                                    <td>{v.icon}<span className={"fileName"}>{v.name}</span></td>
                                    <td>{v.modified}</td>
                                    <td>{v.is_dir ? '-' : formatFileSize(v.size, 1)}</td>
                                    <td>
                                        <div className={!v.is_dir ? "fileActions" : "dirActions"}>
                                            <button onClick={() => downloadFile(v)}>下载</button>
                                            <button>删除</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>

                    </table>
                </div>

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