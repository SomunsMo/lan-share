import React, {useEffect, useRef, useState} from 'react';
import FileSharingStyle, {FileCard} from "./FileSharingStyle.js";
import ProgressBar from "../ProgressBar/ProgressBar.jsx";
import {getFileSharingAPI, uploadFileAPI, renameFileAPI, deleteFileAPI, preUploadCheckAPI, recordDownloadAPI} from "@/service/API.js";
import {formatFileSize, getFileSuffix, copyToClipboard} from "@/util/file.js";
import {useToast} from "@/component/Toast/index.jsx";
import {useDialog} from "@/component/Dialog/index.jsx";
import {useTranslation} from "react-i18next";
import {subscribe, getClientId} from "../../service/sse.js";
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
    const { t } = useTranslation();
    // 文件选择器元素
    const fileSelectorRef = useRef(null);
    const {showToast} = useToast();
    const {showDialog} = useDialog();
    // 被共享的文件列表
    const [sharedFileList, setSharedFileList] = useState([
        {is_dir: true, modified: "1729437814", name: "TestFolder", size: 0},
        {is_dir: false, modified: "1658150371", name: "test.txt", size: 1},
    ]);

    // 上传进度列表
    const [uploadProgresses, setUploadProgresses] = useState([]);

    // 网页端权限配置
    const [permissions, setPermissions] = useState({
        upload_enabled: false,
        rename_file_enabled: false,
        rename_folder_enabled: false,
        delete_file_enabled: false,
        delete_folder_enabled: false,
    });

    // 加载错误信息（如共享目录未配置）
    const [loadError, setLoadError] = useState(null);

    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        item: null
    });

    // 选中的文件集合
    const [selectedFiles, setSelectedFiles] = useState(new Set());

    // 磁盘空间信息
    const [diskSpace, setDiskSpace] = useState({total_space: 0, available_space: 0});

    // 移动端检测
    const [isMobile, setIsMobile] = useState(false);

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

    // 调用接口，获取并更新文件列表（含权限配置和磁盘空间）
    const flushSharedFileList = async (dir) => {
        try {
            const res = await getFileSharingAPI(dir);
            if (res.code !== 200) {
                console.error("获取文件列表异常", res.msg);
                setLoadError(res.msg || t('fileSharing.toast.loadFailed', {error: ''}));
                showToast({message: t('fileSharing.toast.loadFailed', {error: res.msg || '未知错误'}), type: 'error'});
                return false;
            }

            setLoadError(null);

            let data = res.data;
            // 更新权限配置
            if (data.permissions) {
                setPermissions(data.permissions);
            }
            // 更新磁盘空间信息
            if (data.disk_space) {
                setDiskSpace(data.disk_space);
            }
            // 更新文件列表
            let files = data.files || [];
            preprocessSharedFileList(files);
            return true;
        } catch (error) {
            console.error("获取文件列表异常", error);
            setLoadError(error.message || '获取文件列表失败');
            showToast({message: t('fileSharing.toast.loadFailed', {error: error.message || '未知错误'}), type: 'error'});
            return false;
        }
    }

    const showToastRef = useRef();
    const tRef = useRef();
    const getCurrentDirRef = useRef();
    const flushSharedFileListRef = useRef();
    showToastRef.current = showToast;
    tRef.current = t;
    getCurrentDirRef.current = getCurrentDir;
    flushSharedFileListRef.current = flushSharedFileList;

    useEffect(() => {
        const unsub = subscribe(async (evt) => {
            if (evt.type === 'reload') {
                flushSharedFileListRef.current(getCurrentDirRef.current() || '');
                return;
            }
            if (evt.type === 'root_changed') {
                // 共享根目录变更：提示 Web 用户，重置 URL dir 后重拉根目录
                showToastRef.current({message: tRef.current('sse.toast.rootChanged'), type: 'info'});
                const url = new URL(window.location.href);
                url.searchParams.delete('dir');
                window.history.pushState(null, null, url.pathname + url.search);
                flushSharedFileListRef.current('');
                return;
            }
            if (evt.kind !== 'file') return;
            const currentDir = getCurrentDirRef.current() || '';
            if (evt.dir !== currentDir) return;
            const isSelf = evt.client_id && evt.client_id === getClientId();
            const ok = await flushSharedFileListRef.current(currentDir);
            if (!ok || isSelf) return;
            let msg = '';
            if (evt.action === 'upload') {
                msg = tRef.current('sse.toast.fileUploaded', {name: evt.name || ''});
            } else if (evt.action === 'renamed') {
                msg = tRef.current('sse.toast.fileRenamed', {old: evt.old_name || '', new: evt.new_name || ''});
            } else if (evt.action === 'deleted') {
                msg = tRef.current('sse.toast.fileDeleted', {name: evt.name || ''});
            }
            if (msg) showToastRef.current({message: msg, type: 'info'});
        });
        return unsub;
    }, []);

    // 添加或更新进度条
    const updateProgress = (id, title, percent, description = '', status = '') => {
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
        // 调接口取文件列表（含权限配置和磁盘空间）
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

    // 移动端检测
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        setIsMobile(mq.matches);
        const handler = (e) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const fileSelectorHandler = async (e) => {
        const fileList = e.target.files;
        // 用户点击取消（也就是没选择文件）
        if (!fileList || fileList.length === 0) return;

        // 被选中的文件（FileList对象转数组）
        const files = Array.from(fileList);
        console.log(e, files);

        // 清除input的选择（防止下次选择同一个文件不响应onChange）
        fileSelectorRef.current.value = '';


        // 逐个上传文件，避免并发问题
        for (const file of files) {
            // 为每个文件创建唯一的进度ID（在try外部声明，catch中可复用）
            const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const currentDir = getCurrentDir();

            try {
                // 检查文件是否存在
                const checkRes = await preUploadCheckAPI(currentDir || "", file.name);
                if (checkRes.code !== 200) {
                    showToast({
                        message: t('fileSharing.toast.uploadFailed', {name: file.name, error: checkRes.msg || '未知错误'}),
                        type: 'error'
                    });
                    continue;
                }
                if (!checkRes.data.upload_enabled) {
                    showToast({message: t('fileSharing.toast.uploadDisabled'), type: 'warning'});
                    continue;
                }
                // 检查磁盘剩余空间是否足够
                if (checkRes.data.available_space && file.size > checkRes.data.available_space) {
                    showToast({
                        message: t('fileSharing.toast.diskSpaceInsufficient', {name: file.name, need: formatFileSize(file.size), available: formatFileSize(checkRes.data.available_space)}),
                        type: 'error'
                    });
                    continue;
                }
                if (checkRes.data.exists) {
                    if (!checkRes.data.overwrite_enabled) {
                        showToast({message: t('fileSharing.toast.overwriteDisabled'), type: 'warning'});
                        continue;
                    }
                    const confirmed = await showDialog({
                        title: t('fileSharing.dialog.overwriteTitle'),
                        content: t('fileSharing.dialog.overwriteContent', {name: file.name}),
                        buttons: [
                            {label: 'common.button.cancel', value: false},
                            {label: t('fileSharing.dialog.buttonOverwrite'), value: true, primary: true, danger: true},
                        ],
                    });
                    if (!confirmed) continue;
                }
                // 文件Form表单
                let formData = new FormData();
                formData.append("file", file);

                // 创建上传进度条
                updateProgress(fileId, t('fileSharing.toast.uploading', {name: file.name}), 0, `正在上传 ${file.name}`);

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
                    const errorMsg = res.msg || '未知错误';
                    updateProgress(fileId, t('fileSharing.toast.uploading', {name: file.name}), 0, t('fileSharing.toast.uploadFailed', {name: file.name, error: errorMsg}));
                    setTimeout(() => {
                        removeProgress(fileId);
                    }, 3000);
                    showToast({message: t('fileSharing.toast.uploadFailed', {name: file.name, error: errorMsg}), type: 'error'});
                    continue;
                }

                // 上传完成后更新进度条状态
                updateProgress(fileId, t('fileSharing.toast.uploading', {name: file.name}), 100, t('fileSharing.toast.uploadSuccess', {name: file.name}));

                // 2秒后自动移除进度条
                setTimeout(() => {
                    removeProgress(fileId);
                }, 2000);

                // 刷新文件列表以显示新上传的文件
                await flushSharedFileList(currentDir ? currentDir : "");
            } catch (error) {
                console.error('文件上传失败:', file.name, error);

                // 提取服务端返回的错误信息
                const errorMsg = error.message || '未知错误';

                // 复用同一个fileId更新进度条为失败状态
                updateProgress(fileId, t('fileSharing.toast.uploading', {name: file.name}), 0, t('fileSharing.toast.uploadFailed', {name: file.name, error: errorMsg}));

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

    // 复制文件下载链接
    const copyFileLink = async (v) => {
        const currentDir = getCurrentDir();
        const downloadUrl = `${window.location.origin}/download/file?dir=${currentDir ? currentDir : ''}&file_name=${encodeURIComponent(v.name)}`;
        const ok = await copyToClipboard(downloadUrl);
        showToast({message: ok ? t('fileSharing.toast.linkCopied') : t('fileSharing.toast.linkCopyFailed'), type: ok ? 'success' : 'error'});
    }

    // 下载文件
    const downloadFile = async (v) => {
        // 获取当前目录
        const currentDir = getCurrentDir();

        try {
            // 记录下载
            recordDownloadAPI(v.name, currentDir).catch(() => {});

            // 构造下载URL，直接跳转到下载地址
            const downloadUrl = `/download/file?dir=${currentDir ? currentDir : ''}&file_name=${encodeURIComponent(v.name)}`;

            // 使用window.open打开下载链接，让浏览器原生处理下载
            // 这样可以让第三方下载工具接管下载
            window.open(downloadUrl, '_blank');
        } catch (error) {
            console.error('文件下载失败:', error);
            showToast({message: t('fileSharing.toast.downloadFailed', {error: error.message || '未知错误'}), type: 'error'});
        }
    }

    // 重命名文件或文件夹
    const renameFile = async (v) => {
        const newName = await showDialog({
            title: t('fileSharing.dialog.renameTitle'),
            content: t('fileSharing.dialog.renameContent'),
            input: {defaultValue: v.name, placeholder: t('fileSharing.dialog.renamePlaceholder')},
        });
        if (!newName || newName === v.name) return;

        const currentDir = getCurrentDir();
        try {
            const res = await renameFileAPI(currentDir || '', v.name, newName);
            if (res.code === 200) {
                await flushSharedFileList(currentDir || '');
                showToast({message: t('fileSharing.toast.renameSuccess'), type: 'success'});
            } else {
                showToast({message: t('fileSharing.toast.renameFailed', {error: res.msg || '未知错误'}), type: 'error'});
            }
        } catch (error) {
            console.error('重命名失败:', error);
            showToast({message: t('fileSharing.toast.renameFailed', {error: error.message || '未知错误'}), type: 'error'});
        }
    }

    // 删除文件或文件夹
    const deleteFile = async (v) => {
        const confirmMsg = v.is_dir
            ? t('fileSharing.dialog.deleteFolderContent', {name: v.name})
            : t('fileSharing.dialog.deleteFileContent', {name: v.name});

        const confirmed = await showDialog({
            title: t('fileSharing.dialog.deleteTitle'),
            content: confirmMsg,
            buttons: [
                {label: 'common.button.cancel', value: false},
                {label: t('fileSharing.dialog.buttonDelete'), value: true, primary: true, danger: true},
            ],
        });
        if (!confirmed) return;

        const currentDir = getCurrentDir();
        try {
            const res = await deleteFileAPI(currentDir || '', v.name);
            if (res.code === 200) {
                await flushSharedFileList(currentDir || '');
                showToast({message: t('common.toast.deleteSuccess'), type: 'success'});
            } else {
                showToast({message: t('fileSharing.toast.deleteFailed', {error: res.msg || '未知错误'}), type: 'error'});
            }
        } catch (error) {
            console.error('删除失败:', error);
            showToast({message: t('fileSharing.toast.deleteFailed', {error: error.message || '未知错误'}), type: 'error'});
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

    // 显示文件详情
    const showFileDetails = (item) => {
        showDialog({
            title: t('fileSharing.dialog.detailsTitle'),
            content: (
                <table className="detailTable">
                    <tbody>
                        <tr>
                            <td className="detailLabel">{t('fileSharing.dialog.detailName')}</td>
                            <td className="detailValue">{item.name}</td>
                        </tr>
                        <tr>
                            <td className="detailLabel">{t('fileSharing.dialog.detailType')}</td>
                            <td className="detailValue">{item.is_dir ? t('fileSharing.dialog.detailFolder') : ('.' + item.suffix)}</td>
                        </tr>
                        <tr>
                            <td className="detailLabel">{t('fileSharing.dialog.detailSize')}</td>
                            <td className="detailValue">{item.is_dir ? '-' : formatFileSize(item.size, 1)}</td>
                        </tr>
                        <tr>
                            <td className="detailLabel">{t('fileSharing.dialog.detailModified')}</td>
                            <td className="detailValue">{item.modified}</td>
                        </tr>
                    </tbody>
                </table>
            ),
        });
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
        let x = contextMenu.x - 10;
        let y = contextMenu.y;
        const menuWidth = 140;
        const extraItem = isMobile ? 34 : 0;
        const menuHeight = (contextMenu.item?.is_dir ? 192 : 160) + extraItem;

        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 8;
        }
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 8;
        }
        return {x, y};
    };

    return (
        <FileCard>
            {uploadProgresses.length > 0 && <ProgressBar progresses={uploadProgresses}/>}
            <FileSharingStyle>
                {diskSpace.total_space > 0 && (
                    <div className="diskSpaceBar">
                        <div className="diskSpaceInfo">
                            <span>{t('fileSharing.diskSpace')}</span>
                            <span className="diskSpaceDetail">
                                {t('fileSharing.diskSpaceDetail', {available: formatFileSize(diskSpace.available_space), total: formatFileSize(diskSpace.total_space)})}
                            </span>
                        </div>
                        <div className="diskSpaceProgress">
                            <div
                                className="diskSpaceProgressFill"
                                style={{width: `${((diskSpace.total_space - diskSpace.available_space) / diskSpace.total_space * 100).toFixed(1)}%`}}
                            />
                        </div>
                    </div>
                )}
                {loadError ? (
                    <div className="errorState">
                        <div className="errorIcon">&#9888;</div>
                        <p className="errorMessage">{loadError}</p>
                    </div>
                ) : (
                    <>
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
                            <th title={t('fileSharing.tableHeader.name')}>{t('fileSharing.tableHeader.name')}</th>
                            <th title={t('fileSharing.tableHeader.modified')}>{t('fileSharing.tableHeader.modified')}</th>
                            <th title={t('fileSharing.tableHeader.size')}>{t('fileSharing.tableHeader.size')}</th>
                            <th title={t('fileSharing.tableHeader.actions')}>{t('fileSharing.tableHeader.actions')}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {getCurrentDir() && (
                            <tr className={"fileItem goBackItem"} onDoubleClick={goBackToParentDir}>
                                <td></td>
                                <td colSpan={4}>
                                    <span className={"goBackLabel"}>{t('fileSharing.goBack')}</span>
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
                                            {v.is_dir && (
                                                <button onClick={() => itemDoubleClickHandler(v)}>{t('fileSharing.action.open')}</button>
                                            )}
                                            <button onClick={() => downloadFile(v)}>{t('fileSharing.action.download')}</button>
                                            {v.is_dir ? (
                                                <button onClick={async () => {
                                                    const ok = await copyToClipboard(v.name);
                                                    showToast({message: ok ? t('fileSharing.toast.fileNameCopied') : t('fileSharing.toast.fileNameCopyFailed'), type: ok ? 'success' : 'error'});
                                                }}>{t('fileSharing.action.copyFileName')}</button>
                                            ) : (
                                                <button onClick={() => copyFileLink(v)}>{t('fileSharing.action.copyLink')}</button>
                                            )}
                                            {(v.is_dir ? permissions.rename_folder_enabled : permissions.rename_file_enabled) &&
                                                <button onClick={() => renameFile(v)}>{t('fileSharing.action.rename')}</button>}
                                            {(v.is_dir ? permissions.delete_folder_enabled : permissions.delete_file_enabled) &&
                                                <button onClick={() => deleteFile(v)}>{t('fileSharing.action.delete')}</button>}
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
                                showToast({message: t('fileSharing.toast.uploadDisabled'), type: 'warning'});
                                return;
                            }
                            fileSelectorRef.current.click();
                        }}
                        disabled={!permissions.upload_enabled}
                    >{t('fileSharing.uploadBtn')}
                    </button>
                    <button disabled={selectedFiles.size === 0}
                            onClick={() => {
                                const currentDir = getCurrentDir();
                                let index = 0;
                                selectedFiles.forEach(fileName => {
                                    recordDownloadAPI(fileName, currentDir).catch(() => {});
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
                    >{t('fileSharing.batchDownload')}
                    </button>
                </div>
                    </>
                )}

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
                            {isMobile && (
                                <div
                                    className="context-menu-item"
                                    onClick={() => {
                                        showFileDetails(item);
                                        hideContextMenu();
                                    }}
                                >
                                    {t('fileSharing.action.details')}
                                </div>
                            )}
                            {item.is_dir && (
                                <div
                                    className="context-menu-item"
                                    onClick={() => {
                                        itemDoubleClickHandler(item);
                                        hideContextMenu();
                                    }}
                                >
                                    {t('fileSharing.action.open')}
                                </div>
                            )}
                            <div
                                className="context-menu-item"
                                onClick={() => {
                                    downloadFile(item);
                                    hideContextMenu();
                                }}
                            >
                                {t('fileSharing.action.download')}
                            </div>
                            {!item.is_dir && (
                                <div
                                    className="context-menu-item"
                                    onClick={() => {
                                        copyFileLink(item);
                                        hideContextMenu();
                                    }}
                                >
                                    {t('fileSharing.action.copyLink')}
                                </div>
                            )}
                            <div
                                className="context-menu-item"
                                onClick={async () => {
                                    const ok = await copyToClipboard(item.name);
                                    showToast({message: ok ? t('fileSharing.toast.fileNameCopied') : t('fileSharing.toast.fileNameCopyFailed'), type: ok ? 'success' : 'error'});
                                    hideContextMenu();
                                }}
                            >
                                {t('fileSharing.action.copyFileName')}
                            </div>
                            {(item.is_dir ? permissions.rename_folder_enabled : permissions.rename_file_enabled) && (
                                <div
                                    className="context-menu-item"
                                    onClick={() => {
                                        renameFile(item);
                                        hideContextMenu();
                                    }}
                                >
                                    {t('fileSharing.action.rename')}
                                </div>
                            )}
                            {(item.is_dir ? permissions.delete_folder_enabled : permissions.delete_file_enabled) && (
                                <div
                                    className="context-menu-item context-menu-item-danger"
                                    onClick={() => {
                                        deleteFile(item);
                                        hideContextMenu();
                                    }}
                                >
                                    {t('fileSharing.action.delete')}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </FileSharingStyle>
        </FileCard>
    );
}

export default FileSharing;