import React, {useState, useEffect, useRef} from 'react';
import SettingsStyle from "./style.js";
import {invoke} from "@tauri-apps/api/core";
import {open} from '@tauri-apps/plugin-dialog';
import {useToast} from "../../components/toast/index.jsx";
import {useDialog} from "../../components/dialog/index.jsx";
import {useTranslation} from "react-i18next";
import { changeLanguage } from "../../i18n";
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

function Settings() {
    const { t, i18n } = useTranslation();
    const [selectedDirectory, setSelectedDirectory] = useState(t('settings.labels.clickToSelect'));
    const [imageSharingDir, setImageSharingDir] = useState(t('settings.labels.clickToSelect'));
    const [uploadEnabled, setUploadEnabled] = useState(false);
    const [renameFileEnabled, setRenameFileEnabled] = useState(false);
    const [renameFolderEnabled, setRenameFolderEnabled] = useState(false);
    const [deleteFileEnabled, setDeleteFileEnabled] = useState(false);
    const [deleteFolderEnabled, setDeleteFolderEnabled] = useState(false);
    const [uploadOverwriteEnabled, setUploadOverwriteEnabled] = useState(false);
    const [recordCopyEnabled, setRecordCopyEnabled] = useState(false);
    const [recordDownloadEnabled, setRecordDownloadEnabled] = useState(false);
    const [autostartEnabled, setAutostartEnabled] = useState(false);
    const [autostartMinimized, setAutostartMinimized] = useState(false);
    const [deleteToTrash, setDeleteToTrash] = useState(true);
    const [excludeSystemFiles, setExcludeSystemFiles] = useState(true);
    const [excludePatterns, setExcludePatterns] = useState([]);
    const [patternInput, setPatternInput] = useState('');
    const [httpPort, setHttpPort] = useState(3000);
    const [themeSetting, setThemeSetting] = useState("system");
    const [huePrimary, setHuePrimary] = useState(() => {
        try {
            const val = getComputedStyle(document.documentElement).getPropertyValue('--hue-primary').trim();
            return val ? parseInt(val, 10) : 210;
        } catch { return 210; }
    });
    const [satPrimary, setSatPrimary] = useState(() => {
        try {
            const val = getComputedStyle(document.documentElement).getPropertyValue('--sat-primary').trim();
            return val ? parseInt(val, 10) : 100;
        } catch { return 100; }
    });
    const [ligPrimary, setLigPrimary] = useState(() => {
        try {
            const val = getComputedStyle(document.documentElement).getPropertyValue('--lig-primary').trim();
            return val ? parseInt(val, 10) : 40;
        } catch { return 40; }
    });
    const [primaryColorHex, setPrimaryColorHex] = useState('#0065ca');

    const hslToHex = (h, s, l) => {
        s /= 100; l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = (n) => {
            const k = (n + h / 30) % 12;
            return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        };
        const hex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
        return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
    };

    const hexToHsl = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        const l = (max + min) / 2;
        if (delta < 0.01) return { h: 0, s: 0, l: Math.round(l * 100) };
        const s = delta / (1 - Math.abs(2 * l - 1));
        let h = 0;
        if (max === r) h = ((g - b) / delta) % 6;
        else if (max === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        return {
            h: Math.round(((h * 60) % 360 + 360) % 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100),
        };
    };
    const {showToast} = useToast();
    const {showDialog} = useDialog();

    useEffect(() => {
        const fetchAllSettings = async () => {
            try {
                const s = await invoke('get_all_settings');
                setSelectedDirectory(s.sharing_directory);
                setImageSharingDir(s.image_sharing_dir);
                setUploadEnabled(s.upload_enabled);
                setRenameFileEnabled(s.rename_file_enabled);
                setRenameFolderEnabled(s.rename_folder_enabled);
                setDeleteFileEnabled(s.delete_file_enabled);
                setDeleteFolderEnabled(s.delete_folder_enabled);
                setUploadOverwriteEnabled(s.upload_overwrite_enabled);
                setRecordCopyEnabled(s.record_copy_enabled);
                setRecordDownloadEnabled(s.record_download_enabled);
                setAutostartEnabled(s.autostart);
                setAutostartMinimized(s.autostart_minimized);
                setDeleteToTrash(s.delete_to_trash);
                setExcludeSystemFiles(s.exclude_system_files);
                setExcludePatterns(s.exclude_patterns);
                setThemeSetting(s.theme_setting);
                setHttpPort(s.http_port);

                const { h, s: sat, l } = JSON.parse(s.theme_color);
                setHuePrimary(h);
                setSatPrimary(sat);
                setLigPrimary(l);
                setPrimaryColorHex(hslToHex(h, sat, l));
                document.documentElement.style.setProperty('--hue-primary', h);
                document.documentElement.style.setProperty('--sat-primary', `${sat}%`);
                document.documentElement.style.setProperty('--lig-primary', `${l}%`);
                const muiRoots = document.querySelectorAll('[data-mui-color-scheme]');
                (muiRoots.length ? [...muiRoots] : [document.documentElement]).forEach(el => {
                    el.style.setProperty('--mui-palette-primary-main', 'var(--primary)');
                    el.style.setProperty('--mui-palette-primary-contrastText', 'var(--on-primary)');
                    el.style.setProperty('--mui-palette-primary-dark', 'var(--primary-hover)');
                    el.style.setProperty('--mui-palette-secondary-main', 'var(--secondary)');
                    el.style.setProperty('--mui-palette-background-default', 'var(--surface-bright)');
                    el.style.setProperty('--mui-palette-background-paper', 'var(--surface-container-lowest)');
                });
            } catch (error) {
                console.error('获取设置失败:', error);
            }
        };
        fetchAllSettings();
    }, []);

    const handleThemeChange = async (event) => {
        const newTheme = event.target.value;
        if (newTheme === themeSetting) return;

        try {
            await invoke('set_theme_setting', {theme: newTheme});
            setThemeSetting(newTheme);
            const html = document.documentElement;
            html.classList.remove('dark', 'light');
            html.removeAttribute('data-mui-color-scheme');
            if (newTheme === 'dark') {
                html.classList.add('dark');
                html.setAttribute('data-mui-color-scheme', 'dark');
            } else if (newTheme === 'light') {
                html.classList.add('light');
                html.setAttribute('data-mui-color-scheme', 'light');
            }
            showToast({message: t('settings.toast.themeSwitched'), type: 'success'});
        } catch (error) {
            console.error('保存主题设置失败:', error);
            showToast({message: t('settings.toast.themeFailed', {error}), type: 'error'});
        }
    };

    const handleLanguageChange = async (event) => {
        const newLang = event.target.value;
        await changeLanguage(newLang);
    };

    const saveThemeColorRef = useRef(null);

    const applyThemeColor = (h, s, l) => {
        document.documentElement.style.setProperty('--hue-primary', h);
        document.documentElement.style.setProperty('--sat-primary', `${s}%`);
        document.documentElement.style.setProperty('--lig-primary', `${l}%`);
        const muiRoots = document.querySelectorAll('[data-mui-color-scheme]');
        (muiRoots.length ? [...muiRoots] : [document.documentElement]).forEach(el => {
            el.style.setProperty('--mui-palette-primary-main', 'var(--primary)');
            el.style.setProperty('--mui-palette-primary-contrastText', 'var(--on-primary)');
            el.style.setProperty('--mui-palette-primary-dark', 'var(--primary-hover)');
            el.style.setProperty('--mui-palette-secondary-main', 'var(--secondary)');
            el.style.setProperty('--mui-palette-background-default', 'var(--surface-bright)');
            el.style.setProperty('--mui-palette-background-paper', 'var(--surface-container-lowest)');
        });
    };

    const handleColorPick = (event) => {
        const hex = event.target.value;
        setPrimaryColorHex(hex);
        const { h, s, l } = hexToHsl(hex);
        setHuePrimary(h);
        setSatPrimary(s);
        setLigPrimary(l);
        applyThemeColor(h, s, l);

        if (saveThemeColorRef.current) clearTimeout(saveThemeColorRef.current);
        saveThemeColorRef.current = setTimeout(() => {
            invoke('set_theme_color', {h, s, l}).catch(err => {
                console.error('保存主题色失败:', err);
            });
        }, 300);
    };

    const handlePortClick = async () => {
        const input = await showDialog({
            title: t('settings.dialog.changePort.title'),
            content: t('settings.dialog.changePort.content'),
            input: {defaultValue: httpPort.toString(), placeholder: t('settings.dialog.changePort.placeholder')},
        });
        if (input === null || input === undefined) return;

        const newPort = parseInt(input, 10);
        if (isNaN(newPort) || newPort < 1 || newPort > 65535) {
            showToast({message: t('settings.toast.portInvalid'), type: 'error'});
            return;
        }

        if (newPort === httpPort) return;

        try {
            await invoke('set_http_port', {port: newPort});
            setHttpPort(newPort);
            showToast({message: t('settings.toast.portSaved'), type: 'success'});
        } catch (error) {
            console.error('保存HTTP端口设置失败:', error);
            showToast({message: t('settings.toast.portFailed', {error}), type: 'error'});
        }
    };

    const selectDirectory = async () => {
        try {
            const selectedPath = await open({
                directory: true,
                multiple: false,
                title: t('home.selectDirTitle')
            });

            if (selectedPath) {
                setSelectedDirectory(selectedPath);
                try {
                    await invoke('set_sharing_directory', {directoryPath: selectedPath});
                } catch (backendError) {
                    console.error('保存共享根目录到后端失败:', backendError);
                    showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.shareRoot'), error: backendError.message}), type: 'error'});
                }
            }
        } catch (error) {
            console.error('选择文件夹时出错:', error);
            showToast({message: t('settings.toast.selectFailed', {error: error.message}), type: 'error'});
        }
    };

    const selectImageDir = async () => {
        try {
            const selectedPath = await open({
                directory: true,
                multiple: false,
                title: t('imageSharing.selectDirTitle')
            });
            if (!selectedPath) return;
            if (selectedPath === imageSharingDir) return;

            const confirmed = await showDialog({
                title: t('imageSharing.dirConfigTitle'),
                content: (
                    <div>
                        <p>{t('imageSharing.dirMigrateContent', {path: selectedPath})}</p>
                        <p style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{t('imageSharing.dirMigrateHint')}</p>
                    </div>
                ),
                buttons: [
                    {label: 'imageSharing.cancelChange', value: false},
                    {label: 'imageSharing.confirmMigrate', value: true, primary: true},
                ],
            });
            if (!confirmed) return;

            try {
                await invoke('migrate_image_sharing_dir', {from: imageSharingDir, to: selectedPath});
            } catch (error) {
                console.error('迁移图片文件失败:', error);
                showToast({message: t('settings.toast.migrateFailed', {error: error.message}), type: 'error'});
                return;
            }

            try {
                await invoke('set_image_sharing_dir', {directoryPath: selectedPath});
                setImageSharingDir(selectedPath);
                showToast({message: t('settings.toast.dirChanged'), type: 'success'});
            } catch (backendError) {
                console.error('保存图片共享目录到后端失败:', backendError);
                showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.imageShareDir'), error: backendError.message}), type: 'error'});
            }
        } catch (error) {
            console.error('选择文件夹时出错:', error);
            showToast({message: t('settings.toast.selectFailed', {error: error.message}), type: 'error'});
        }
    };

    const openDirectory = async (dirPath) => {
        if (!dirPath || dirPath === t('settings.labels.clickToSelect')) return;
        try {
            await invoke('open_folder', {path: dirPath});
        } catch (error) {
            console.error('打开目录失败:', error);
            showToast({message: t('settings.toast.openDirFailed', {error: error.message}), type: 'error'});
        }
    };

    const handleUploadChange = async (event) => {
        const checked = event.target.checked;
        setUploadEnabled(checked);

        try {
            await invoke('set_upload_enabled', {enabled: checked});
        } catch (error) {
            console.error('保存上传设置失败:', error);
            setUploadEnabled(!checked);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.webUpload'), error: error.message}), type: 'error'});
        }
    };

    const handleRenameFileChange = async (event) => {
        const checked = event.target.checked;
        setRenameFileEnabled(checked);
        try {
            await invoke('set_rename_file_enabled', {enabled: checked});
        } catch (error) {
            console.error('保存重命名文件设置失败:', error);
            setRenameFileEnabled(!checked);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.webRenameFile'), error: error.message}), type: 'error'});
        }
    };

    const handleRenameFolderChange = async (event) => {
        const checked = event.target.checked;
        setRenameFolderEnabled(checked);
        try {
            await invoke('set_rename_folder_enabled', {enabled: checked});
        } catch (error) {
            console.error('保存重命名文件夹设置失败:', error);
            setRenameFolderEnabled(!checked);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.webRenameFolder'), error: error.message}), type: 'error'});
        }
    };

    const handleDeleteFileChange = async (event) => {
        const checked = event.target.checked;
        setDeleteFileEnabled(checked);
        try {
            await invoke('set_delete_file_enabled', {enabled: checked});
        } catch (error) {
            console.error('保存删除文件设置失败:', error);
            setDeleteFileEnabled(!checked);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.webDeleteFile'), error: error.message}), type: 'error'});
        }
    };

    const handleDeleteFolderChange = async (event) => {
        const checked = event.target.checked;
        setDeleteFolderEnabled(checked);
        try {
            await invoke('set_delete_folder_enabled', {enabled: checked});
        } catch (error) {
            console.error('保存删除文件夹设置失败:', error);
            setDeleteFolderEnabled(!checked);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.webDeleteFolder'), error: error.message}), type: 'error'});
        }
    };

    const handleDeleteToTrashChange = async (event) => {
        const checked = event.target.checked;

        if (!checked) {
            const confirmed = await showDialog({
                title: t('settings.dialog.deleteToTrashWarning.title'),
                content: t('settings.dialog.deleteToTrashWarning.content'),
                buttons: [
                    { label: 'common.button.cancel', value: false },
                    { label: 'common.button.confirm', value: true, primary: true, danger: true },
                ],
            });
            if (!confirmed) return;
        }

        setDeleteToTrash(checked);
        try {
            await invoke('set_delete_to_trash', {enabled: checked});
        } catch (error) {
            console.error('保存删除到回收站设置失败:', error);
            setDeleteToTrash(!checked);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.deleteToTrash'), error: error.message}), type: 'error'});
        }
    };

    const handleUploadOverwriteChange = async (event) => {
        const checked = event.target.checked;
        setUploadOverwriteEnabled(checked);

        try {
            await invoke('set_upload_overwrite_enabled', {enabled: checked});
        } catch (error) {
            console.error('保存上传覆盖设置失败:', error);
            setUploadOverwriteEnabled(!checked);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.uploadOverwrite'), error: error.message}), type: 'error'});
        }
    };

    const handleRecordCopyChange = async (event) => {
        const checked = event.target.checked;
        setRecordCopyEnabled(checked);
        try {
            await invoke('set_record_copy_enabled', {enabled: checked});
        } catch (error) {
            console.error('保存复制记录设置失败:', error);
            setRecordCopyEnabled(!checked);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.recordCopy'), error: error.message}), type: 'error'});
        }
    };

    const handleRecordDownloadChange = async (event) => {
        const checked = event.target.checked;
        setRecordDownloadEnabled(checked);
        try {
            await invoke('set_record_download_enabled', {enabled: checked});
        } catch (error) {
            console.error('保存下载记录设置失败:', error);
            setRecordDownloadEnabled(!checked);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.recordDownload'), error: error.message}), type: 'error'});
        }
    };

    const clearTextRecords = async () => {
        const confirmed = await showDialog({
            title: t('history.clearDialog.title'),
            content: t('history.clearDialog.contentText'),
            buttons: [
                {label: 'common.button.cancel', value: false},
                {label: t('history.clearDialog.buttonClear'), value: true, primary: true, danger: true},
            ],
        });
        if (!confirmed) return;
        await invoke("clear_sharing_text");
        showToast({message: t('history.toast.textCleared'), type: 'success'});
    };

    const clearFileRecords = async () => {
        const confirmed = await showDialog({
            title: t('history.clearDialog.title'),
            content: t('history.clearDialog.contentFile'),
            buttons: [
                {label: 'common.button.cancel', value: false},
                {label: t('history.clearDialog.buttonClear'), value: true, primary: true, danger: true},
            ],
        });
        if (!confirmed) return;
        await invoke("clear_sharing_file");
        showToast({message: t('history.toast.fileCleared'), type: 'success'});
    };

    const handleAutostartChange = async (event) => {
        const checked = event.target.checked;
        setAutostartEnabled(checked);

        try {
            await invoke('set_autostart', {enabled: checked});
        } catch (error) {
            console.error('保存开机自启设置失败:', error);
            setAutostartEnabled(!checked);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.autostart'), error: error.message}), type: 'error'});
        }
    };

    const handleAutostartMinimizedChange = async (event) => {
        const checked = event.target.checked;
        setAutostartMinimized(checked);

        try {
            await invoke('set_autostart_minimized', {enabled: checked});
        } catch (error) {
            console.error('保存开机最小化启动设置失败:', error);
            setAutostartMinimized(!checked);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.autostartMinimized'), error: error.message}), type: 'error'});
        }
    };

    const handleExcludeSystemChange = async (event) => {
        const checked = event.target.checked;
        setExcludeSystemFiles(checked);
        try {
            await invoke('set_exclude_system_files', {enabled: checked});
        } catch (error) {
            setExcludeSystemFiles(!checked);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.excludeSystemFiles'), error: error.message}), type: 'error'});
        }
    };

    const handleAddPattern = async () => {
        const trimmed = patternInput.trim();
        if (!trimmed) return;
        if (excludePatterns.includes(trimmed)) {
            showToast({message: t('settings.toast.patternDuplicate'), type: 'info'});
            return;
        }
        try {
            new RegExp(trimmed);
        } catch {
            showToast({message: t('settings.toast.patternInvalid'), type: 'error'});
            return;
        }
        const newPatterns = [...excludePatterns, trimmed];
        setExcludePatterns(newPatterns);
        setPatternInput('');
        try {
            await invoke('set_exclude_patterns', {patterns: newPatterns});
        } catch (error) {
            setExcludePatterns(excludePatterns);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.excludePatterns'), error: error.message}), type: 'error'});
        }
    };

    const handleRemovePattern = async (patternToRemove) => {
        const newPatterns = excludePatterns.filter(p => p !== patternToRemove);
        setExcludePatterns(newPatterns);
        try {
            await invoke('set_exclude_patterns', {patterns: newPatterns});
        } catch (error) {
            setExcludePatterns(excludePatterns);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.excludePatterns'), error: error.message}), type: 'error'});
        }
    };

    const optionMap = [
        {
            name: t('settings.sectionNetwork'),
            icon: 'settings',
            options: [
                {
                    name: t('settings.option.port'),
                    desc: t('settings.option.portDesc'),
                    content: (
                        <Button variant="text" onClick={handlePortClick} sx={{ textTransform: 'none', gap: 0.5, fontSize: '0.875rem', color: 'var(--accent)', '&:hover': { background: 'var(--surface-container-highest)' } }}>
                            {httpPort}
                            <svg viewBox="0 0 24 24" width="16" height="16" style={{fill:'none',stroke:'currentColor',strokeWidth:2}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </Button>
                    ),
                },
            ]
        },
        {
            name: t('settings.sectionSystem'),
            icon: 'power',
            options: [
                {
                    name: t('settings.option.autostart'),
                    desc: t('settings.option.autostartDesc'),
                    content: (
                        <Switch checked={autostartEnabled} onChange={handleAutostartChange} />
                    ),
                },
                {
                    name: t('settings.option.autostartMinimized'),
                    desc: t('settings.option.autostartMinimizedDesc'),
                    content: (
                        <Switch checked={autostartMinimized} disabled={!autostartEnabled} onChange={handleAutostartMinimizedChange} />
                    ),
                },
            ]
        },
        {
            name: t('settings.sectionAppearance'),
            icon: 'palette',
            options: [
                {
                    name: t('settings.option.theme'),
                    desc: t('settings.option.themeDesc'),
                    content: (
                        <Select value={themeSetting} onChange={handleThemeChange} size="small" sx={{ minWidth: 120, fontSize: '0.875rem' }}>
                            <MenuItem value="system">{t('settings.themeOption.system')}</MenuItem>
                            <MenuItem value="light">{t('settings.themeOption.light')}</MenuItem>
                            <MenuItem value="dark">{t('settings.themeOption.dark')}</MenuItem>
                        </Select>
                    ),
                },
                {
                    name: t('settings.option.themeColor'),
                    desc: t('settings.option.themeColorDesc'),
                    content: (
                        <div className="hue-picker">
                            <label className="color-swatch-wrap">
                                <span className="color-swatch" style={{ background: `hsl(${huePrimary}, ${satPrimary}%, ${ligPrimary}%)` }} />
                                <input type="color" value={primaryColorHex} onChange={handleColorPick} className="color-input-hidden" />
                            </label>
                            <span className="hue-label">{huePrimary}° {satPrimary}% {ligPrimary}%</span>
                        </div>
                    ),
                },
                {
                    name: t('settings.option.language'),
                    desc: t('settings.option.languageDesc'),
                    content: (
                        <Select value={i18n.language} onChange={handleLanguageChange} size="small" sx={{ minWidth: 120, fontSize: '0.875rem' }}>
                            <MenuItem value="zh-CN">{t('settings.languageOption.zh-CN')}</MenuItem>
                            <MenuItem value="en">{t('settings.languageOption.en')}</MenuItem>
                        </Select>
                    ),
                },
            ]
        },
        {
            name: t('settings.sectionRecords'),
            icon: 'clock',
            options: [
                {
                    name: t('settings.option.recordCopy'),
                    desc: t('settings.option.recordCopyDesc'),
                    content: (<Switch checked={recordCopyEnabled} onChange={handleRecordCopyChange} />),
                },
                {
                    name: t('settings.option.recordDownload'),
                    desc: t('settings.option.recordDownloadDesc'),
                    content: (<Switch checked={recordDownloadEnabled} onChange={handleRecordDownloadChange} />),
                },
                {
                    name: t('settings.option.clearTextRecords'),
                    desc: t('settings.option.clearTextRecordsDesc'),
                    content: (<Button variant="outlined" color="error" size="small" onClick={clearTextRecords}>{t('history.clearDialog.buttonClear')}</Button>),
                },
                {
                    name: t('settings.option.clearFileRecords'),
                    desc: t('settings.option.clearFileRecordsDesc'),
                    content: (<Button variant="outlined" color="error" size="small" onClick={clearFileRecords}>{t('history.clearDialog.buttonClear')}</Button>),
                },
            ]
        },
        {
            name: t('settings.sectionFileSharing'),
            icon: 'folder',
            options: [
                {
                    name: t('settings.option.shareRoot'),
                    desc: t('settings.option.shareRootDesc'),
                    content: (
                        <div className="directory-row">
                            <TextField value={selectedDirectory} slotProps={{ input: { readOnly: true } }} sx={{ flex: 1, minWidth: 260, '& input': { fontSize: '0.875rem' } }} />
                            <Button variant="contained" size="small" onClick={selectDirectory} sx={{ '&:hover': { backgroundColor: 'var(--primary-hover)' } }}>{t('settings.labels.browse')}</Button>
                            <Button variant="outlined" size="small" onClick={() => openDirectory(selectedDirectory)} sx={{ minWidth: 0, px: 1, '&:hover': { backgroundColor: 'var(--surface-container-highest)' } }} title={t('settings.labels.openDir')}>
                                <svg viewBox="0 0 24 24" width="16" height="16" style={{fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'}}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                            </Button>
                        </div>
                    ),
                },
                {
                    name: t('settings.option.imageShareDir'),
                    desc: t('settings.option.imageShareDirDesc'),
                    content: (
                        <div className="directory-row">
                            <TextField value={imageSharingDir} slotProps={{ input: { readOnly: true } }} sx={{ flex: 1, minWidth: 260, '& input': { fontSize: '0.875rem' } }} />
                            <Button variant="contained" size="small" onClick={selectImageDir} sx={{ '&:hover': { backgroundColor: 'var(--primary-hover)' } }}>{t('settings.labels.browse')}</Button>
                            <Button variant="outlined" size="small" onClick={() => openDirectory(imageSharingDir)} sx={{ minWidth: 0, px: 1, '&:hover': { backgroundColor: 'var(--surface-container-highest)' } }} title={t('settings.labels.openDir')}>
                                <svg viewBox="0 0 24 24" width="16" height="16" style={{fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'}}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                            </Button>
                        </div>
                    ),
                },
                {divider: true},
                {
                    name: t('settings.option.webUpload'),
                    desc: t('settings.option.webUploadDesc'),
                    content: (<Switch checked={uploadEnabled} onChange={handleUploadChange} />),
                },
                {
                    name: t('settings.option.uploadOverwrite'),
                    desc: t('settings.option.uploadOverwriteDesc'),
                    content: (<Switch checked={uploadOverwriteEnabled} onChange={handleUploadOverwriteChange} />),
                },
                {
                    name: t('settings.option.webRenameFile'),
                    desc: t('settings.option.webRenameFileDesc'),
                    content: (<Switch checked={renameFileEnabled} onChange={handleRenameFileChange} />),
                },
                {
                    name: t('settings.option.webRenameFolder'),
                    desc: t('settings.option.webRenameFolderDesc'),
                    content: (<Switch checked={renameFolderEnabled} onChange={handleRenameFolderChange} />),
                },
                {
                    name: t('settings.option.webDeleteFile'),
                    desc: t('settings.option.webDeleteFileDesc'),
                    content: (<Switch checked={deleteFileEnabled} onChange={handleDeleteFileChange} />),
                },
                {
                    name: t('settings.option.webDeleteFolder'),
                    desc: t('settings.option.webDeleteFolderDesc'),
                    content: (<Switch checked={deleteFolderEnabled} onChange={handleDeleteFolderChange} />),
                },
                {
                    name: t('settings.option.deleteToTrash'),
                    desc: t('settings.option.deleteToTrashDesc'),
                    content: (<Switch checked={deleteToTrash} onChange={handleDeleteToTrashChange} />),
                },
                {
                    name: t('settings.option.excludeSystemFiles'),
                    desc: t('settings.option.excludeSystemFilesDesc'),
                    content: (<Switch checked={excludeSystemFiles} onChange={handleExcludeSystemChange} />),
                },
                {
                    name: t('settings.option.excludePatterns'),
                    desc: t('settings.option.excludePatternsDesc'),
                    content: (
                        <div className="exclude-patterns">
                            <div className="pattern-input-row">
                                <TextField
                                    value={patternInput}
                                    onChange={(e) => setPatternInput(e.target.value)}
                                    placeholder={t('settings.option.excludePatternPlaceholder')}
                                    sx={{ flex: 1, minWidth: 260, '& input': { fontSize: '0.875rem' } }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddPattern(); }}
                                />
                                <Button variant="contained" size="small" onClick={handleAddPattern} sx={{ '&:hover': { backgroundColor: 'var(--primary-hover)' } }}>+</Button>
                            </div>
                            <div className="pattern-chips">
                                {excludePatterns.length === 0 && (
                                    <Typography variant="caption" sx={{ color: 'var(--on-surface-variant)' }}>{t('settings.option.noExcludePatterns')}</Typography>
                                )}
                                {excludePatterns.map((p, i) => (
                                    <div className="pattern-chip" key={i}>
                                        <span className="pattern-chip-text">{p}</span>
                                        <button className="pattern-chip-remove" onClick={() => handleRemovePattern(p)}>×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ),
                },
            ]
        },
    ];

    const sectionIcons = {
        'settings': <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
        'power': <svg viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>,
        'palette': <svg viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="10.5" r="1.5"/><circle cx="6.5" cy="13.5" r="1.5"/><path d="M12 2a10 10 0 0 0-6.88 17.26A9.7 9.7 0 0 0 10 21a2 2 0 0 0 2-2 2 2 0 0 1 2-2h4a2 2 0 0 0 2-2 10 10 0 0 0-8-13z"/></svg>,
        'folder': <svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
        'clock': <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    };

    return (
        <SettingsStyle>
            <div className="page-header">
                <Typography variant="h4" sx={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--on-surface)' }}>{t('settings.pageTitle') || 'Settings'}</Typography>
            </div>
            {optionMap.map((section, si) => (
                <div className="section-card" key={si}>
                    <div className="section-header">
                        <div className="section-header-top">
                            {sectionIcons[section.icon]}
                            <Typography variant="h6" fontSize="1.5rem" fontWeight={600} sx={{ color: 'var(--on-surface)' }}>{section.name}</Typography>
                        </div>
                    </div>
                    <div className="section-body">
                        {section.options.map((opt, oi) => (
                            opt.divider ? (
                                <Divider key={oi} sx={{ my: 0.5 }} />
                            ) : (
                                <div className="option-row" key={oi}>
                                    <div className="option-label">
                                        <Typography variant="subtitle2" fontSize="0.875rem" fontWeight={600} sx={{ color: 'var(--on-surface)' }}>{opt.name}</Typography>
                                        {opt.desc && <Typography variant="caption" fontSize="0.875rem" sx={{ color: 'var(--on-surface-variant)' }}>{opt.desc}</Typography>}
                                    </div>
                                    {opt.content}
                                </div>
                            )
                        ))}
                    </div>
                </div>
            ))}
        </SettingsStyle>
    );
}

export default Settings;
