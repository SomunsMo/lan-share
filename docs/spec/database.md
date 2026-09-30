# 数据库

- `config` 表: `cfg_key` 列有 `UNIQUE` 约束（`CREATE TABLE` 时声明 + `CREATE UNIQUE INDEX` 兼容旧库），写入配置必须使用 `config_dao::set_config()`（使用 `ON CONFLICT(cfg_key) DO UPDATE` UPSERT）
- `transfer_record` 表: 共享内容历史记录（`id, action_type, content, source_id, ip, is_overwrite, created_at, updated_at, share_count, last_share_ip, pinned_at`），旧表 `upload_record` 启动时自动迁移至此表
- `transfer_record.pinned_at`: 置顶时间，毫秒级 `strftime('%Y-%m-%d %H:%M:%f','now','localtime')`（`datetime` 只有秒精度，同秒内置顶多条顺序不定），`NULL` 表示未置顶；由 `upload_dao::set_pinned` 写入或清空
- 置顶排序只作用于桌面端「共享文图」页: `list_by_types(&[1, 5], true)` → `ORDER BY pinned_at IS NULL, pinned_at DESC, updated_at DESC, id DESC`（最后置顶的排最前）；Web 端 `/upload/records` 传 `false` 仍按 `updated_at DESC`，历史记录页 `query_paginated` 游标与 `updated_at` 绑定，不参与置顶排序
- `share_record` 表: 每次共享事件记录（`id, transfer_id, ip, created_at`），文本(1)/图片(5)每次共享写入一行；启动时对已有文本/图片记录回填一条初始记录
- `transfer_record.last_share_ip`: 最近一次共享的 IP，每次共享时更新；`share_count` 为总共享次数（首次计 1，每次重复共享 +1），两者由 `upload_dao::add_with_share` / `record_share_event` 在同一事务内维护
