import React, {useState, useEffect} from 'react';
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

function Settings() {
    const { t, i18n } = useTranslation();
    const [selectedDirectory, setSelectedDirectory] = useState(t('settings.labels.clickToSelect'));
    const [uploadEnabled, setUploadEnabled] = useState(false);
    const [renameEnabled, setRenameEnabled] = useState(false);
    const [deleteEnabled, setDeleteEnabled] = useState(false);
    const [uploadOverwriteEnabled, setUploadOverwriteEnabled] = useState(false);
    const [recordCopyEnabled, setRecordCopyEnabled] = useState(false);
    const [recordDownloadEnabled, setRecordDownloadEnabled] = useState(false);
    const [autostartEnabled, setAutostartEnabled] = useState(false);
    const [httpPort, setHttpPort] = useState(3000);
    const [themeSetting, setThemeSetting] = useState("system");
    const {showToast} = useToast();
    const {showDialog} = useDialog();

    useEffect(() => {
        const fetchCurrentDirectory = async () => {
            try {
                const currentDir = await invoke('get_sharing_directory');
                setSelectedDirectory(currentDir);
            } catch (error) {
                console.error('获取当前共享目录失败:', error);
            }
        };

        const fetchUploadSetting = async () => {
            try {
                const enabled = await invoke('get_upload_enabled');
                setUploadEnabled(enabled);
            } catch (error) {
                console.error('获取上传设置失败:', error);
                setUploadEnabled(false);
            }
        };

        const fetchRenameSetting = async () => {
            try {
                const enabled = await invoke('get_rename_enabled');
                setRenameEnabled(enabled);
            } catch (error) {
                console.error('获取重命名设置失败:', error);
                setRenameEnabled(false);
            }
        };

        const fetchDeleteSetting = async () => {
            try {
                const enabled = await invoke('get_delete_enabled');
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
                setUploadOverwriteEnabled(enabled);
            } catch (error) {
                console.error('获取上传覆盖设置失败:', error);
                setUploadOverwriteEnabled(false);
            }
        };

        fetchUploadOverwriteSetting();

        const fetchRecordCopySetting = async () => {
            try {
                const enabled = await invoke('get_record_copy_enabled');
                setRecordCopyEnabled(enabled);
            } catch (error) {
                console.error('获取复制记录设置失败:', error);
                setRecordCopyEnabled(false);
            }
        };

        fetchRecordCopySetting();

        const fetchRecordDownloadSetting = async () => {
            try {
                const enabled = await invoke('get_record_download_enabled');
                setRecordDownloadEnabled(enabled);
            } catch (error) {
                console.error('获取下载记录设置失败:', error);
                setRecordDownloadEnabled(false);
            }
        };

        fetchRecordDownloadSetting();

        const fetchAutostartSetting = async () => {
            try {
                const enabled = await invoke('get_autostart');
                setAutostartEnabled(enabled);
            } catch (error) {
                console.error('获取开机自启设置失败:', error);
                setAutostartEnabled(false);
            }
        };

        fetchAutostartSetting();

        const fetchThemeSetting = async () => {
            try {
                const theme = await invoke('get_theme_setting');
                setThemeSetting(theme);
            } catch (error) {
                console.error('获取主题设置失败:', error);
                setThemeSetting("system");
            }
        };

        fetchThemeSetting();

        const fetchHttpPort = async () => {
            try {
                const port = await invoke('get_http_port');
                setHttpPort(port);
            } catch (error) {
                console.error('获取HTTP端口设置失败:', error);
                setHttpPort(3000);
            }
        };

        fetchHttpPort();
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

    const handleRenameChange = async (event) => {
        const checked = event.target.checked;
        setRenameEnabled(checked);

        try {
            await invoke('set_rename_enabled', {enabled: checked});
        } catch (error) {
            console.error('保存重命名设置失败:', error);
            setRenameEnabled(!checked);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.webRename'), error: error.message}), type: 'error'});
        }
    };

    const handleDeleteChange = async (event) => {
        const checked = event.target.checked;
        setDeleteEnabled(checked);

        try {
            await invoke('set_delete_enabled', {enabled: checked});
        } catch (error) {
            console.error('保存删除设置失败:', error);
            setDeleteEnabled(!checked);
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.webDelete'), error: error.message}), type: 'error'});
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

    const optionMap = [
        {
            name: t('settings.sectionNetwork'),
            icon: 'settings',
            hint: t('settings.sectionNetworkHint'),
            options: [
                {
                    name: t('settings.option.port'),
                    desc: t('settings.option.portDesc'),
                    content: (
                        <Button variant="text" onClick={handlePortClick} sx={{ textTransform: 'none', gap: 0.5, fontSize: '0.82rem', color: 'var(--accent)' }}>
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
            hint: t('settings.sectionSystemHint'),
            options: [
                {
                    name: t('settings.option.autostart'),
                    desc: t('settings.option.autostartDesc'),
                    content: (
                        <Switch checked={autostartEnabled} onChange={handleAutostartChange} />
                    ),
                },
            ]
        },
        {
            name: t('settings.sectionAppearance'),
            icon: 'palette',
            hint: t('settings.sectionAppearanceHint'),
            options: [
                {
                    name: t('settings.option.theme'),
                    desc: t('settings.option.themeDesc'),
                    content: (
                        <Select value={themeSetting} onChange={handleThemeChange} size="small" sx={{ minWidth: 120, fontSize: '0.82rem' }}>
                            <MenuItem value="system">{t('settings.themeOption.system')}</MenuItem>
                            <MenuItem value="light">{t('settings.themeOption.light')}</MenuItem>
                            <MenuItem value="dark">{t('settings.themeOption.dark')}</MenuItem>
                        </Select>
                    ),
                },
                {
                    name: t('settings.option.language'),
                    desc: t('settings.option.languageDesc'),
                    content: (
                        <Select value={i18n.language} onChange={handleLanguageChange} size="small" sx={{ minWidth: 120, fontSize: '0.82rem' }}>
                            <MenuItem value="zh-CN">{t('settings.languageOption.zh-CN')}</MenuItem>
                            <MenuItem value="en">{t('settings.languageOption.en')}</MenuItem>
                        </Select>
                    ),
                },
            ]
        },
        {
            name: t('settings.sectionPermissions'),
            icon: 'shield',
            hint: t('settings.sectionPermissionsHint'),
            options: [
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
                    name: t('settings.option.webRename'),
                    desc: t('settings.option.webRenameDesc'),
                    content: (<Switch checked={renameEnabled} onChange={handleRenameChange} />),
                },
                {
                    name: t('settings.option.webDelete'),
                    desc: t('settings.option.webDeleteDesc'),
                    content: (<Switch checked={deleteEnabled} onChange={handleDeleteChange} />),
                },
            ]
        },
        {
            name: t('settings.sectionRecords'),
            icon: 'clock',
            hint: t('settings.sectionRecordsHint'),
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
            ]
        },
        {
            name: t('settings.sectionStorage'),
            icon: 'folder',
            hint: t('settings.sectionStorageHint'),
            options: [
                {
                    name: t('settings.option.shareRoot'),
                    desc: t('settings.option.shareRootDesc'),
                    content: (
                        <div className="directory-row">
                            <TextField size="small" value={selectedDirectory} slotProps={{ input: { readOnly: true } }} onClick={selectDirectory} sx={{ cursor: 'pointer', flex: 1, '& input': { fontSize: '0.85rem', cursor: 'pointer' } }} />
                            <Button variant="contained" size="small" onClick={selectDirectory}>{t('settings.labels.browse')}</Button>
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
        'shield': <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
        'folder': <svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
        'clock': <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    };

    return (
        <SettingsStyle>
            <div className="page-header">
                <Typography variant="h4" fontWeight={700}>{t('settings.pageTitle') || 'Settings'}</Typography>
            </div>
            {optionMap.map((section, si) => (
                <div className="section-card" key={si}>
                    <div className="section-header">
                        <div className="section-header-top">
                            {sectionIcons[section.icon]}
                            <Typography variant="h6" fontWeight={600}>{section.name}</Typography>
                        </div>
                        <Typography variant="body2" color="var(--on-surface-variant)">{section.hint}</Typography>
                    </div>
                    <div className="section-body">
                        {section.options.map((opt, oi) => (
                            <div className="option-row" key={oi}>
                                <div className="option-label">
                                    <Typography variant="subtitle2" fontWeight={600}>{opt.name}</Typography>
                                    {opt.desc && <Typography variant="caption" color="var(--on-surface-variant)">{opt.desc}</Typography>}
                                </div>
                                {opt.content}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </SettingsStyle>
    );
}

export default Settings;
