# 访问密码

- 仅保护 Web/HTTP；桌面端 IPC 不受影响。单一密码、无账户
- 配置键（`config` 表）：`password_enabled`（`true`/`false`）、`password_hash`、`login_failure_policy`（`lockout`/`delay`）
- 哈希格式 `sha256$<salt_b64>$<hash_b64>`；16 字节随机盐，见 `auth::hash_password` / `auth::verify_password`
- 会话：内存 `HashMap` 保存 token；应用/服务重启、改密、关闭密码、登出时清空
- Cookie `lan_share_session`：`HttpOnly; SameSite=Lax; Path=/`，长期 `Max-Age`
- 鉴权入口 `auth::guard`（`http_server.rs::handle_request` 最前）；公开路径仅 `/`、`/web`、`/auth/*`、`/favicon.ico`
- 未授权 API 返回 401 JSON；下载/预览/图片或 `Accept: text/html` 返回 401 HTML 引导页
- 未登录访问 `/web` 始终返回内置前端（登录页），登录后才返回自定义 `frontend/index.html`
- 登录接口 `POST /auth/login` 请求体 `{"password":"..."}`，成功写会话 Cookie；`GET /auth/status`、`POST /auth/logout` 公开
- 失败策略：`lockout` 同 IP 5 次失败锁 30 秒；`delay` 每次失败固定延迟 1 秒；仅记录 IP 与 UA，不记录密码
- 密码最少 6 位；密码保护开启时不允许清除密码（`auth::clear_password` 返回错误）
- IPC：`get_password_status`、`set_password_enabled`、`set_password`、`clear_password`、`get_login_failure_policy`、`set_login_failure_policy`、`restart_http_server`
- 开启保护立即生效；已设置密码时桌面端提示“重启/确定”，重启走 `http_server::restart_server`（断开现有连接、清空会话，不重启应用）
- SSE 心跳调用 `auth::validate_current_auth`，会话失效后主动断开；Web 端 `sse.js` 检测未登录时停止自动重连并回到登录页
- Web 端 401 由 `MyAxios.js` 触发 `authEvents` 全局事件，`App.jsx` 切回 `<Login>`
