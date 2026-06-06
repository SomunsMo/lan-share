import React, {useState, useEffect} from 'react';
import SettingsStyle from "./style.js";
import {invoke} from "@tauri-apps/api/core";
import {open} from '@tauri-apps/plugin-dialog';
import Card from "../../components/card/Card.js";
import {useToast} from "../../components/toast/index.jsx";
import {useDialog} from "../../components/dialog/index.jsx";
import {useTranslation} from "react-i18next";
import { changeLanguage } from "../../i18n";

function Settings() {
    const { t, i18n } = useTranslation();
    const [selectedDirectory, setSelectedDirectory] = useState(t('settings.labels.clickToSelect'));
    const [uploadEnabled, setUploadEnabled] = useState(false);
    const [renameEnabled, setRenameEnabled] = useState(false);
    const [deleteEnabled, setDeleteEnabled] = useState(false);
    const [uploadOverwriteEnabled, setUploadOverwriteEnabled] = useState(false);
    const [autostartEnabled, setAutostartEnabled] = useState(false);
    const [httpPort, setHttpPort] = useState(3000);
    const [themeSetting, setThemeSetting] = useState("system");
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

        const fetchThemeSetting = async () => {
            try {
                const theme = await invoke('get_theme_setting');
                console.log('当前主题设置是:', theme);
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
                console.log('当前HTTP端口设置是:', port);
                setHttpPort(port);
            } catch (error) {
                console.error('获取HTTP端口设置失败:', error);
                setHttpPort(3000);
            }
        };

        fetchHttpPort();
    }, []);


    // 处理主题变更（下拉选择）
    // 处理主题变更（下拉选择）
    const handleThemeChange = async (event) => {
        const newTheme = event.target.value;
        if (newTheme === themeSetting) return;

        try {
            await invoke('set_theme_setting', {theme: newTheme});
            setThemeSetting(newTheme);
            const html = document.documentElement;
            html.classList.remove('dark', 'light');
            if (newTheme === 'dark') html.classList.add('dark');
            else if (newTheme === 'light') html.classList.add('light');
            showToast({message: t('settings.toast.themeSwitched'), type: 'success'});
        } catch (error) {
            console.error('保存主题设置失败:', error);
            showToast({message: t('settings.toast.themeFailed', {error}), type: 'error'});
        }
    };

    // 处理语言变更（下拉选择）
    const handleLanguageChange = async (event) => {
        const newLang = event.target.value;
        await changeLanguage(newLang);
    };

    // 处理端口变更（点击后弹出输入框）
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
            console.log('HTTP端口设置已更新:', newPort);
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
                console.log('已选择文件夹:', selectedPath);

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
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.webUpload'), error: error.message}), type: 'error'});
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
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.webRename'), error: error.message}), type: 'error'});
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
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.webDelete'), error: error.message}), type: 'error'});
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
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.uploadOverwrite'), error: error.message}), type: 'error'});
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
            showToast({message: t('settings.toast.saveFailed', {name: t('settings.option.autostart'), error: error.message}), type: 'error'});
        }
    };

    // ========================================

    // 设置的选项关系表
    const optionMap = [
        {
            name: t('settings.sectionBasic'),
            options: [
                {
                    name: t('settings.option.port'),
                    content: (
                        <span
                            className="port-text"
                            onClick={handlePortClick}
                            title={t('settings.labels.clickToModify')}
                        >
                            {httpPort}
                        </span>
                    ),
                }, {
                    name: t('settings.option.autostart'),
                    content: (
                        <input
                            type="checkbox"
                            className="toggle"
                            checked={autostartEnabled}
                            onChange={handleAutostartChange}
                        />
                    ),
                },
                {
                    name: t('settings.option.theme'),
                    content: (
                        <select
                            className="theme-select"
                            value={themeSetting}
                            onChange={handleThemeChange}
                        >
                            <option value="system">{t('settings.themeOption.system')}</option>
                            <option value="light">{t('settings.themeOption.light')}</option>
                            <option value="dark">{t('settings.themeOption.dark')}</option>
                        </select>
                    ),
                },
                {
                    name: t('settings.option.language'),
                    content: (
                        <select
                            className="theme-select"
                            value={i18n.language}
                            onChange={handleLanguageChange}
                        >
                            <option value="zh-CN">{t('settings.languageOption.zh-CN')}</option>
                            <option value="en">{t('settings.languageOption.en')}</option>
                        </select>
                    ),
                },
            ]
        },
        {
            name: t('settings.sectionSharing'),
            options: [
                {
                    name: t('settings.option.shareRoot'),
                    content: (
                        <span
                            className="directory-text"
                            onClick={selectDirectory}
                            title={t('settings.labels.clickToChange')}
                        >
                              {selectedDirectory}
                        </span>
                    ),
                },
                {
                    name: t('settings.option.webUpload'),
                    content: (
                        <input
                            type="checkbox"
                            className="toggle"
                            checked={uploadEnabled}
                            onChange={handleUploadChange}
                        />
                    ),
                },
                {
                    name: t('settings.option.uploadOverwrite'),
                    content: (
                        <input
                            type="checkbox"
                            className="toggle"
                            checked={uploadOverwriteEnabled}
                            onChange={handleUploadOverwriteChange}
                        />
                    ),
                },
                {
                    name: t('settings.option.webRename'),
                    content: (
                        <input
                            type="checkbox"
                            className="toggle"
                            checked={renameEnabled}
                            onChange={handleRenameChange}
                        />
                    ),
                },
                {
                    name: t('settings.option.webDelete'),
                    content: (
                        <input
                            type="checkbox"
                            className="toggle"
                            checked={deleteEnabled}
                            onChange={handleDeleteChange}
                        />
                    ),
                }
            ]},
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