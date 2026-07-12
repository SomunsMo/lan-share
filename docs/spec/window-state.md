# 窗口状态持久化

- 窗口关闭时（CloseRequested 事件）保存位置/尺寸到 SQLite `config` 表
- 启动时从 DB 预加载到 `WINDOW_STATE_JSON: OnceLock<Option<String>>`，`setup()` 中恢复
- 窗口尺寸限制在当前显示器范围内，位置偏移时居中到主显示器
- 窗口默认 `visible: false`，`setup()` 中根据 `--silent` 参数决定是否显示
