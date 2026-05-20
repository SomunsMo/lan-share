import React, {useEffect, useRef, useState} from 'react';
import FileSharingStyle from "./FileSharingStyle.js";
import Card from "../Card/Card.js";
import ProgressBar from "../ProgressBar/ProgressBar.jsx";
import {getFileSharingAPI, uploadFileAPI, renameFileAPI, deleteFileAPI, getPermissionsAPI} from "@/service/API.js";
import {formatFileSize, getFileSuffix} from "@/util/file.js";
import {useToast} from "@/component/Toast/index.jsx";
import {useDialog} from "@/component/Dialog/index.jsx";
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
    const {showToast} = useToast();
    const {showDialog} = useDialog();
    // 被共享的文件列表
    const [sharedFileList, setSharedFileList] = useState([
        {is_dir: true, modified: "1729437814", name: "TestFolder", size: 0},
        {is_dir: false, modified: "1658150371", name: "test.txt", size: 1},
    ]);

    // 将要上传的文件列表
    const [filesToUpload, setFilesToUpload] = useState([]);

    // 上传进度列表
    const [uploadProgresses, setUploadProgresses] = useState([]);

    // 网页端权限配置
    const [permissions, setPermissions] = useState({
        upload_enabled: false,
        rename_enabled: false,
        delete_enabled: false,
    });

    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        item: null
    });

    // 选中的文件集合
    const [selectedFiles, setSelectedFiles] = useState(new Set());

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

    // 添加或更新进度条
    const updateProgress = (id, title, percent, description = '', status = '上传中') => {
        setUploadProgresses(prev => {
            const existingIndex = prev.findIndex(p => p.id === id);
            const newProgress = {
                id,
                title,
                percent,
                description,
                status
            };

            if (existingIndex >= 0) {
                // 更新现有进度
                const updated = [...prev];
                updated[existingIndex] = newProgress;
                return updated;
            } else {
                // 添加新的进度条
                return [...prev, newProgress];
            }
        });
    };

    // 移除进度条
    const removeProgress = (id) => {
        setUploadProgresses(prev => prev.filter(p => p.id !== id));
    };

    useEffect(() => {

        let currentDir = getCurrentDir();
        // 调接口取文件列表
        flushSharedFileList(currentDir ? currentDir : "");

        // 获取权限配置
        const fetchPermissions = async () => {
            try {
                const res = await getPermissionsAPI();
                if (res.code === 200 && res.data) {
                    setPermissions(res.data);
                }
            } catch (error) {
                console.error('获取权限配置失败:', error);
            }
        };
        fetchPermissions();

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

    const fileSelectorHandler = async (e) => {
        const fileList = e.target.files;
        // 用户点击取消（也就是没选择文件）
        if (!fileList || fileList.length === 0) return;

        // 被选中的文件（FileList对象转数组）
        const files = Array.from(fileList);
        console.log(e, files);
        setFilesToUpload(files);

        // 清除input的选择（防止下次选择同一个文件不响应onChange）
        fileSelectorRef.current.value = '';


        // 逐个上传文件，避免并发问题
        for (const file of files) {
            // 为每个文件创建唯一的进度ID（在try外部声明，catch中可复用）
            const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const currentDir = getCurrentDir();

            try {
                // 文件Form表单
                let formData = new FormData();
                formData.append("file", file);

                // 创建上传进度条
                updateProgress(fileId, `上传文件: ${file.name}`, 0, `正在上传 ${file.name}`, '准备上传');

                // 上传文件到当前目录，添加进度事件监听
                const res = await uploadFileAPI(formData, currentDir || "", (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        updateProgress(fileId, `上传文件: ${file.name}`, percentCompleted,
                            `已上传 ${(progressEvent.loaded / 1024 / 1024).toFixed(2)}MB / ${(progressEvent.total / 1024 / 1024).toFixed(2)}MB`,
                            '上传中');
                    }
                });

                console.log("文件上传结果：", res);

                // 检查响应中的业务状态码
                if (res.code !== 200) {
                    const errorMsg = res.status || '未知错误';
                    updateProgress(fileId, `上传文件: ${file.name}`, 0, `文件 ${file.name} 上传失败`, '上传失败');
                    setTimeout(() => {
                        removeProgress(fileId);
                    }, 3000);
                    showToast({message: `文件 ${file.name} 上传失败: ${errorMsg}`, type: 'error'});
                    continue;
                }

                // 上传完成后更新进度条状态
                updateProgress(fileId, `上传文件: ${file.name}`, 100, `文件 ${file.name} 上传完成`, '上传完成');

                // 2秒后自动移除进度条
                setTimeout(() => {
                    removeProgress(fileId);
                }, 2000);

                // 刷新文件列表以显示新上传的文件
                await flushSharedFileList(currentDir ? currentDir : "");
            } catch (error) {
                console.error('文件上传失败:', file.name, error);

                // 提取服务端返回的错误信息
                const errorMsg = error.status || error.message || '未知错误';

                // 复用同一个fileId更新进度条为失败状态
                updateProgress(fileId, `上传文件: ${file.name}`, 0, `文件 ${file.name} 上传失败`, '上传失败');

                // 3秒后移除错误进度条
                setTimeout(() => {
                    removeProgress(fileId);
                }, 3000);

                showToast({message: `文件 ${file.name} 上传失败: ${errorMsg}`, type: 'error'});
            }
        }
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
            showToast({message: '文件下载失败: ' + (error.message || '未知错误'), type: 'error'});
        }
    }

    // 重命名文件或文件夹
    const renameFile = async (v) => {
        const newName = await showDialog({
            title: '重命名',
            content: `请输入新名称：`,
            input: {defaultValue: v.name, placeholder: '请输入新名称'},
        });
        if (!newName || newName === v.name) return;

        const currentDir = getCurrentDir();
        try {
            const res = await renameFileAPI(currentDir || '', v.name, newName);
            if (res.code === 200) {
                await flushSharedFileList(currentDir || '');
                showToast({message: '重命名成功', type: 'success'});
            } else {
                showToast({message: '重命名失败: ' + (res.status || '未知错误'), type: 'error'});
            }
        } catch (error) {
            console.error('重命名失败:', error);
            showToast({message: '重命名失败: ' + (error.status || error.message || '未知错误'), type: 'error'});
        }
    }

    // 删除文件或文件夹
    const deleteFile = async (v) => {
        const confirmMsg = v.is_dir
            ? `确定要删除文件夹 "${v.name}" 及其所有内容吗？`
            : `确定要删除文件 "${v.name}" 吗？`;

        const confirmed = await showDialog({
            title: '确认删除',
            content: confirmMsg,
            buttons: [
                {label: '取消', value: false},
                {label: '删除', value: true, primary: true, danger: true},
            ],
        });
        if (!confirmed) return;

        const currentDir = getCurrentDir();
        try {
            const res = await deleteFileAPI(currentDir || '', v.name);
            if (res.code === 200) {
                await flushSharedFileList(currentDir || '');
                showToast({message: '删除成功', type: 'success'});
            } else {
                showToast({message: '删除失败: ' + (res.status || '未知错误'), type: 'error'});
            }
        } catch (error) {
            console.error('删除失败:', error);
            showToast({message: '删除失败: ' + (error.status || error.message || '未知错误'), type: 'error'});
        }
    }

    // 返回上层目录
    const goBackToParentDir = async () => {
        const currentDir = getCurrentDir();
        if (!currentDir) return;

        const lastSlashIndex = currentDir.lastIndexOf('/');
        const parentDir = lastSlashIndex > 0 ? currentDir.substring(0, lastSlashIndex) : '';

        if (await flushSharedFileList(parentDir)) {
            window.history.pushState(null, null, parentDir ? `?dir=${parentDir}` : window.location.pathname);
            setSelectedFiles(new Set());
        }
    }

    // 切换文件选中状态
    const toggleFileSelection = (fileName) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            if (next.has(fileName)) {
                next.delete(fileName);
            } else {
                next.add(fileName);
            }
            return next;
        });
    }

    // 显示右键菜单
    const showContextMenu = (e, item) => {
        e.preventDefault();
        e.stopPropagation();

        const x = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
        const y = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

        setContextMenu({
            visible: true,
            x,
            y,
            item
        });
    };

    // 隐藏右键菜单
    const hideContextMenu = () => {
        setContextMenu({visible: false, x: 0, y: 0, item: null});
    };

    // 长按计时器
    const longPressTimerRef = useRef(null);

    // 触摸开始（移动端长按）
    const handleTouchStart = (e, item) => {
        longPressTimerRef.current = setTimeout(() => {
            const touch = e.touches[0];
            setContextMenu({
                visible: true,
                x: touch.clientX,
                y: touch.clientY,
                item
            });
        }, 500);
    };

    // 触摸结束/移动（取消长按）
    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    // 点击其他文件项或组件外区域时隐藏菜单，点击文件列表空白区域不关闭
    useEffect(() => {
        const handleClick = (e) => {
            if (!contextMenu.visible) return;
            // 点击了右键菜单自身，不关闭
            if (e.target.closest('.context-menu')) return;
            // 点击了文件列表内的空白区域，不关闭
            if (e.target.closest('.fileList') && !e.target.closest('.fileItem')) return;
            // 点击了其他文件项或组件外区域，关闭
            setContextMenu({visible: false, x: 0, y: 0, item: null});
        };

        // 滚动时隐藏菜单
        const handleScroll = () => {
            if (contextMenu.visible) {
                setContextMenu({visible: false, x: 0, y: 0, item: null});
            }
        };

        document.addEventListener('click', handleClick);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('click', handleClick);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [contextMenu.visible]);

    // 调整菜单位置，防止超出视口
    const getAdjustedMenuPosition = () => {
        let x = contextMenu.x;
        let y = contextMenu.y;
        const menuWidth = 140;
        const menuHeight = contextMenu.item?.is_dir ? 192 : 160;

        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 8;
        }
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 8;
        }
        return {x, y};
    };

    return (
        <Card>
            {uploadProgresses.length > 0 && <ProgressBar progresses={uploadProgresses}/>}
            <FileSharingStyle>
                <div className="fileList">
                    <table className={"fileTable"}>
                        <colgroup>
                            <col width={"40px"}/>
                            <col width="45%"/>
                            {/*操作时间*/}
                            <col width={"160px"}/>
                            {/*大小*/}
                            <col width={"80px"}/>
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
                        {getCurrentDir() && (
                            <tr className={"fileItem goBackItem"} onDoubleClick={goBackToParentDir}>
                                <td></td>
                                <td colSpan={4}>
                                    <span className={"goBackLabel"}>.. (返回上层)</span>
                                </td>
                            </tr>
                        )}
                        {sharedFileList.map((v, i) => {
                            return (
                                <tr className={"fileItem"} key={v.name + i}
                                    onDoubleClick={() => itemDoubleClickHandler(v)}
                                    onContextMenu={(e) => showContextMenu(e, v)}
                                    onMouseEnter={() => {
                                        if (contextMenu.visible && contextMenu.item && contextMenu.item.name !== v.name) {
                                            hideContextMenu();
                                        }
                                    }}
                                    onTouchStart={(e) => handleTouchStart(e, v)}
                                    onTouchEnd={handleTouchEnd}
                                    onTouchMove={handleTouchEnd}>
                                    <td>
                                        <div className={"checkbox"}>{!v.is_dir &&
                                            <input type={"checkbox"}
                                                   checked={selectedFiles.has(v.name)}
                                                   onChange={() => toggleFileSelection(v.name)}/>
                                        }</div>
                                    </td>
                                    <td>{v.icon}<span className={"fileName"} title={v.name}>{v.name}</span></td>
                                    <td>{v.modified}</td>
                                    <td>{v.is_dir ? '-' : formatFileSize(v.size, 1)}</td>
                                    <td>
                                        <div className={!v.is_dir ? "fileActions" : "dirActions"}>
                                            <button onClick={() => downloadFile(v)}>下载</button>
                                            {permissions.rename_enabled &&
                                                <button onClick={() => renameFile(v)}>重命名</button>}
                                            {permissions.delete_enabled &&
                                                <button onClick={() => deleteFile(v)}>删除</button>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>

                    </table>
                </div>

                <div className="batchActions">
                    <input type={"file"}
                           multiple
                           onChange={fileSelectorHandler}
                           ref={fileSelectorRef}
                           style={{display: "none"}}/>
                    <button
                        onClick={() => {
                            if (!permissions.upload_enabled) {
                                showToast({message: '上传功能已被禁用', type: 'warning'});
                                return;
                            }
                            fileSelectorRef.current.click();
                        }}
                        disabled={!permissions.upload_enabled}
                    >上传文件
                    </button>
                    <button disabled={selectedFiles.size === 0}
                            onClick={() => {
                                const currentDir = getCurrentDir();
                                let index = 0;
                                selectedFiles.forEach(fileName => {
                                    setTimeout(() => {
                                        const link = document.createElement('a');
                                        link.href = `/download/file?dir=${currentDir || ''}&file_name=${encodeURIComponent(fileName)}`;
                                        link.download = fileName;
                                        link.click();
                                    }, index * 300);
                                    index++;
                                });
                                setSelectedFiles(new Set());
                            }}
                    >批量下载</button>
                </div>

                {/* 右键菜单 */}
                {contextMenu.visible && contextMenu.item && (() => {
                    const pos = getAdjustedMenuPosition();
                    const item = contextMenu.item;
                    return (
                        <div
                            className="context-menu"
                            style={{
                                left: pos.x,
                                top: pos.y,
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {item.is_dir && (
                                <div
                                    className="context-menu-item"
                                    onClick={() => {
                                        itemDoubleClickHandler(item);
                                        hideContextMenu();
                                    }}
                                >
                                    打开
                                </div>
                            )}
                            <div
                                className="context-menu-item"
                                onClick={() => {
                                    downloadFile(item);
                                    hideContextMenu();
                                }}
                            >
                                下载
                            </div>
                            <div
                                className="context-menu-item"
                                onClick={() => {
                                    navigator.clipboard.writeText(item.name);
                                    showToast({message: '文件名已复制', type: 'success'});
                                    hideContextMenu();
                                }}
                            >
                                复制文件名
                            </div>
                            {permissions.rename_enabled && (
                                <div
                                    className="context-menu-item"
                                    onClick={() => {
                                        renameFile(item);
                                        hideContextMenu();
                                    }}
                                >
                                    重命名
                                </div>
                            )}
                            {permissions.delete_enabled && (
                                <div
                                    className="context-menu-item context-menu-item-danger"
                                    onClick={() => {
                                        deleteFile(item);
                                        hideContextMenu();
                                    }}
                                >
                                    删除
                                </div>
                            )}
                        </div>
                    );
                })()}
            </FileSharingStyle>
        </Card>
    );
}

export default FileSharing;