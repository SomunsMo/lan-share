# 数据库

- `config` 表: `cfg_key` 列有 `UNIQUE` 约束（`CREATE TABLE` 时声明 + `CREATE UNIQUE INDEX` 兼容旧库），写入配置必须使用 `config_dao::set_config()`（使用 `ON CONFLICT(cfg_key) DO UPDATE` UPSERT）
- `transfer_record` 表: 共享内容历史记录（`id, action_type, content, source_id, ip, is_overwrite, created_at`），旧表 `upload_record` 启动时自动迁移至此表
