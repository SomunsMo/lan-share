# 开机最小化启动

- `autostart_minimized` 配置项写入 SQLite `config` 表
- IPC 命令: `get_autostart_minimized`, `set_autostart_minimized`
- 通过 `update_autostart_args()` 追加 `--silent` 参数到 autostart 命令
- Windows: 写入注册表 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- macOS: 修改 `LaunchAgents` plist
- Linux: 修改 `autostart` desktop 文件的 `Exec=` 行
