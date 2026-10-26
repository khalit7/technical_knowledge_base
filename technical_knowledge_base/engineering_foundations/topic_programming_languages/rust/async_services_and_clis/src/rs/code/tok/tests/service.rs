//! Two kinds of service test: the Router called directly (no socket), and a real server on a real port.
use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use std::time::Duration;
use tok::service::{Config, CountResp, app};
use tower::ServiceExt; // for .oneshot()

fn cfg() -> Config {
    Config { max_body_bytes: 1 << 20, request_timeout: Duration::from_millis(500), offload: true }
}

#[tokio::test]
async fn count_without_a_network() {
    let req = Request::post("/count")
        .header("content-type", "application/json")
        .body(Body::from(r#"{"text":"x86_64 and v2.1"}"#))
        .unwrap();
    let resp = app(cfg()).oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let bytes = resp.into_body().collect().await.unwrap().to_bytes();
    let body: CountResp = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(body.tokens, 5); // x86, 64, and, v2, 1
}

#[tokio::test]
async fn missing_field_is_422() {
    let req = Request::post("/count")
        .header("content-type", "application/json")
        .body(Body::from(r#"{"txt":"oops"}"#))
        .unwrap();
    let resp = app(cfg()).oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[tokio::test]
async fn slow_request_times_out() {
    let req = Request::get("/slow?ms=2000").body(Body::empty()).unwrap();
    let resp = app(cfg()).oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::REQUEST_TIMEOUT);
}

/// A real server on port 0 (the OS picks a free port), talked to over TCP.
#[tokio::test]
async fn real_server_over_tcp() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app(cfg())).await.unwrap() });

    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let mut s = tokio::net::TcpStream::connect(addr).await.unwrap();
    s.write_all(b"GET /health HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n").await.unwrap();
    let mut raw = String::new();
    s.read_to_string(&mut raw).await.unwrap();
    assert!(raw.starts_with("HTTP/1.1 200 OK"), "{raw}");
    assert!(raw.ends_with("\r\n\r\nok"), "{raw}");
}
