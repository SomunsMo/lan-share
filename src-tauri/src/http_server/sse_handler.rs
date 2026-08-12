use crate::handler::GenericResponseBody;
use hyper::body::{Bytes, Incoming};
use hyper::{header, Request, Response, StatusCode};
use lan_share_http_macros::get;
use tokio::sync::mpsc;

#[get("/api/events")]
pub async fn events_handler(
    _req: Request<Incoming>,
) -> Result<Response<GenericResponseBody>, std::convert::Infallible> {
    let (tx, rx) = mpsc::channel::<Bytes>(16);
    let mut sse_rx = crate::http_server::sse::subscribe();

    tokio::spawn(async move {
        let mut heartbeats = tokio::time::interval(std::time::Duration::from_secs(15));
        loop {
            tokio::select! {
                msg = sse_rx.recv() => {
                    match msg {
                        Ok(frame) => {
                            if tx.send(Bytes::from(frame)).await.is_err() {
                                break;
                            }
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                            log::warn!("SSE 订阅端丢帧 {} 条，发送 reload 帧让前端自行重拉", n);
                            // 广播错过消息：发一条显式 reload 帧（type 字段唯一标识），前端据此整体重拉
                            if tx.send(Bytes::from_static(b"data: {\"type\":\"reload\"}\n\n")).await.is_err() {
                                break;
                            }
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                    }
                }
                _ = heartbeats.tick() => {
                    if tx.send(Bytes::from_static(b": keep-alive\n\n")).await.is_err() {
                        break;
                    }
                }
            }
        }
    });

    let mut response = Response::new(GenericResponseBody::Stream(rx));
    *response.status_mut() = StatusCode::OK;
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        "text/event-stream; charset=utf-8".parse().unwrap(),
    );
    response.headers_mut().insert(header::CACHE_CONTROL, "no-cache".parse().unwrap());
    response.headers_mut().insert(header::CONNECTION, "keep-alive".parse().unwrap());
    Ok(response)
}

#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn broadcast_frame_encoding_is_valid() {
        let ev = crate::http_server::sse::new_file_renamed("sub", "a.txt", "b.txt", None);
        let json = serde_json::to_string(&ev).unwrap();
        assert!(json.contains("\"seq\":0"));
        assert!(json.contains("\"dir\":\"sub\""));
        assert!(json.contains("\"old_name\":\"a.txt\""));
    }
}
