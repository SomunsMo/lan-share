# 版本号规则

- 版本号采用 **x.y.z** 格式（语义化版本）
- 版本号统一在 `Cargo.toml` 和 `tauri.conf.json` 中维护，两者保持一致
- 应用内版本号通过 Rust IPC 命令 `get_app_version` 从 `env!("CARGO_PKG_VERSION")` 编译时读取
- GitHub Release tag 使用 `v` 前缀（如 `v1.0.2`），由 `compare_versions()` 函数自动去除 `v` 前缀后比较
