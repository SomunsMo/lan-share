use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::OnceLock;
use std::sync::LazyLock;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::broadcast;
use tauri::Emitter;

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum EventKind {
    Text,
    Image,
    File,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum EventAction {
    Upload,
    Renamed,
    Deleted,
}

#[derive(Clone, Serialize)]
pub struct SseEvent {
    pub seq: u64,
    pub kind: EventKind,
    pub action: EventAction,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub old_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dir: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,
    pub ts: u64,
}

pub fn new_text(client_id: Option<String>) -> SseEvent {
    SseEvent {
        seq: 0,
        kind: EventKind::Text,
        action: EventAction::Upload,
        name: None,
        old_name: None,
        new_name: None,
        dir: None,
        client_id,
        ts: 0,
    }
}

pub fn new_image(client_id: Option<String>) -> SseEvent {
    SseEvent {
        seq: 0,
        kind: EventKind::Image,
        action: EventAction::Upload,
        name: None,
        old_name: None,
        new_name: None,
        dir: None,
        client_id,
        ts: 0,
    }
}

pub fn new_file_upload(dir: &str, name: &str, client_id: Option<String>) -> SseEvent {
    SseEvent {
        seq: 0,
        kind: EventKind::File,
        action: EventAction::Upload,
        name: Some(name.to_string()),
        old_name: None,
        new_name: None,
        dir: Some(dir.to_string()),
        client_id,
        ts: 0,
    }
}

pub fn new_file_renamed(dir: &str, old: &str, _new: &str, client_id: Option<String>) -> SseEvent {
    SseEvent {
        seq: 0,
        kind: EventKind::File,
        action: EventAction::Renamed,
        name: None,
        old_name: Some(old.to_string()),
        new_name: Some(_new.to_string()),
        dir: Some(dir.to_string()),
        client_id,
        ts: 0,
    }
}

pub fn new_file_deleted(dir: &str, name: &str, client_id: Option<String>) -> SseEvent {
    SseEvent {
        seq: 0,
        kind: EventKind::File,
        action: EventAction::Deleted,
        name: Some(name.to_string()),
        old_name: None,
        new_name: None,
        dir: Some(dir.to_string()),
        client_id,
        ts: 0,
    }
}

pub fn new_clear() -> SseEvent {
    SseEvent {
        seq: 0,
        kind: EventKind::Text,
        action: EventAction::Deleted,
        name: None,
        old_name: None,
        new_name: None,
        dir: None,
        client_id: None,
        ts: 0,
    }
}

pub fn new_text_deleted() -> SseEvent {
    SseEvent {
        seq: 0,
        kind: EventKind::Text,
        action: EventAction::Deleted,
        name: None,
        old_name: None,
        new_name: None,
        dir: None,
        client_id: None,
        ts: 0,
    }
}

pub fn new_image_deleted() -> SseEvent {
    SseEvent {
        seq: 0,
        kind: EventKind::Image,
        action: EventAction::Deleted,
        name: None,
        old_name: None,
        new_name: None,
        dir: None,
        client_id: None,
        ts: 0,
    }
}

static EVENT_TX: LazyLock<broadcast::Sender<String>> = LazyLock::new(|| {
    let (tx, _rx) = broadcast::channel(1024);
    tx
});

static SEQ: AtomicU64 = AtomicU64::new(0);
static APP_HANDLE: OnceLock<tauri::AppHandle> = OnceLock::new();

pub fn init_app(app: tauri::AppHandle) {
    let _ = APP_HANDLE.set(app);
}

pub fn fire(event: SseEvent) {
    let seq = SEQ.fetch_add(1, Ordering::Relaxed) + 1;
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let event = SseEvent { seq, ts, ..event };

    let json = match serde_json::to_string(&event) {
        Ok(j) => j,
        Err(e) => {
            log::error!("SseEvent 序列化失败: {}", e);
            return;
        }
    };
    let frame = format!("data: {}\n\n", json);

    if EVENT_TX.send(frame).is_err() {
        log::warn!("SSE 广播发送失败（无订阅者或溢出）");
    }

    if let Some(app) = APP_HANDLE.get() {
        let _ = app.emit("lan-share:content-updated", &event);
    }
}

pub fn subscribe() -> tokio::sync::broadcast::Receiver<String> {
    EVENT_TX.subscribe()
}

/// 普通设置变更（权限/排除文件）：通知 Web 保持当前目录重拉文件列表（不含 permissions 刷新由列表响应携带）
pub fn fire_reload() {
    let frame = "data: {\"type\":\"reload\"}\n\n".to_string();
    if EVENT_TX.send(frame).is_err() {
        log::warn!("SSE 广播发送失败（无订阅者或溢出）");
    }
}

/// 共享根目录变更：通知 Web 重置 URL dir 后重拉根目录
pub fn fire_root_changed() {
    let frame = "data: {\"type\":\"root_changed\"}\n\n".to_string();
    if EVENT_TX.send(frame).is_err() {
        log::warn!("SSE 广播发送失败（无订阅者或溢出）");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_event_to_sse_frame() {
        let ev = SseEvent {
            seq: 1,
            kind: EventKind::File,
            action: EventAction::Renamed,
            name: None,
            old_name: Some("a.txt".into()),
            new_name: Some("b.txt".into()),
            dir: Some("sub".into()),
            client_id: Some("cid-1".into()),
            ts: 1700000000,
        };
        let json = serde_json::to_string(&ev).unwrap();
        let sse = format!("data: {}\n\n", json);
        assert!(sse.starts_with("data: {"));
        assert!(sse.ends_with("\n\n"));
        assert!(sse.contains("\"kind\":\"file\""));
        assert!(sse.contains("\"action\":\"renamed\""));
        assert!(sse.contains("\"old_name\":\"a.txt\""));
        // Option 空值应被 skip：name 字段不出现在 JSON
        assert!(!json.contains("\"name\""));
        assert!(!json.contains("\"id\""));
    }

    #[test]
    fn builders_set_expected_fields() {
        let ev = new_file_renamed("", "a.txt", "b.txt", Some("cid".to_string()));
        assert!(matches!(ev.action, EventAction::Renamed));
        assert_eq!(ev.dir.as_deref(), Some(""));
        assert_eq!(ev.old_name.as_deref(), Some("a.txt"));
        assert_eq!(ev.new_name.as_deref(), Some("b.txt"));
        assert_eq!(ev.client_id.as_deref(), Some("cid"));
    }

    #[test]
    fn text_deleted_builder_fields() {
        let ev = new_text_deleted();
        assert!(matches!(ev.kind, EventKind::Text));
        assert!(matches!(ev.action, EventAction::Deleted));
        assert!(ev.name.is_none());
        assert!(ev.client_id.is_none());
    }

    #[test]
    fn image_deleted_builder_fields() {
        let ev = new_image_deleted();
        assert!(matches!(ev.kind, EventKind::Image));
        assert!(matches!(ev.action, EventAction::Deleted));
        assert!(ev.name.is_none());
        assert!(ev.client_id.is_none());
    }
}