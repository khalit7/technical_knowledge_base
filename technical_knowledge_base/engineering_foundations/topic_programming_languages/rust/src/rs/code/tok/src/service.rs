//! The HTTP service: routes, shared state, errors and middleware.
//! Kept in the library so tests can build the same Router without a network.
use crate::{Tally, count_tokens};
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;
use tower_http::{limit::RequestBodyLimitLayer, timeout::TimeoutLayer, trace::TraceLayer};

/// Settings the service reads at start-up (from flags or environment, see tokserve.rs).
#[derive(Clone, Debug)]
pub struct Config {
    pub max_body_bytes: usize,
    pub request_timeout: Duration,
    /// Run CPU-heavy work on tokio's blocking pool (true) or inline on the async worker (false).
    pub offload: bool,
}

/// Shared state: one instance, behind an Arc, cloned (cheaply) into every request.
pub struct AppState {
    pub cfg: Config,
    pub requests: AtomicU64,
    pub tokens_counted: AtomicU64,
}

#[derive(Deserialize)]
pub struct CountReq {
    pub text: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CountResp {
    pub tokens: u64,
}

#[derive(Serialize)]
pub struct Stats {
    pub requests: u64,
    pub tokens_counted: u64,
}

/// Errors a handler can return. IntoResponse turns each into a status code and a JSON body.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("body is not valid UTF-8")]
    NotUtf8,
    #[error("text is empty")]
    Empty,
    #[error("worker failed: {0}")]
    Join(#[from] tokio::task::JoinError),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match self {
            AppError::NotUtf8 | AppError::Empty => StatusCode::BAD_REQUEST,
            AppError::Join(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };
        (status, Json(serde_json::json!({ "error": self.to_string() }))).into_response()
    }
}

pub fn app(cfg: Config) -> Router {
    let timeout = cfg.request_timeout;
    let limit = cfg.max_body_bytes;
    let state = Arc::new(AppState { cfg, requests: AtomicU64::new(0), tokens_counted: AtomicU64::new(0) });
    Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/count", post(count))
        .route("/count_log", post(count_log))
        .route("/slow", get(slow))
        .route("/stats", get(stats))
        .with_state(state)
        // Layers wrap every route; the last added is the outermost.
        // axum's own extractor limit (2 MB) is replaced by one configurable limit for every route.
        .layer(DefaultBodyLimit::disable())
        .layer(RequestBodyLimitLayer::new(limit))
        .layer(TimeoutLayer::with_status_code(StatusCode::REQUEST_TIMEOUT, timeout))
        .layer(TraceLayer::new_for_http())
}

/// POST /count {"text": "..."} -> {"tokens": n}
async fn count(State(st): State<Arc<AppState>>, Json(req): Json<CountReq>) -> Result<Json<CountResp>, AppError> {
    st.requests.fetch_add(1, Ordering::Relaxed);
    if req.text.is_empty() {
        return Err(AppError::Empty);
    }
    let tokens = count_tokens(&req.text);
    st.tokens_counted.fetch_add(tokens, Ordering::Relaxed);
    Ok(Json(CountResp { tokens }))
}

/// POST /count_log with a JSONL body -> the root program's report as JSON.
/// Counting a large body is CPU work: with offload on it runs on the blocking pool.
async fn count_log(State(st): State<Arc<AppState>>, body: axum::body::Bytes) -> Result<Json<crate::Report>, AppError> {
    st.requests.fetch_add(1, Ordering::Relaxed);
    let work = move || -> Result<crate::Report, AppError> {
        let text = std::str::from_utf8(&body).map_err(|_| AppError::NotUtf8)?;
        let mut t = Tally::default();
        t.add_text(text);
        Ok(t.report(5))
    };
    let report = if st.cfg.offload { tokio::task::spawn_blocking(work).await?? } else { work()? };
    st.tokens_counted.fetch_add(report.tokens, Ordering::Relaxed);
    Ok(Json(report))
}

#[derive(Deserialize)]
struct SlowQ {
    ms: u64,
}

/// GET /slow?ms=N waits N ms without blocking a thread (a stand-in for a call to a model API).
async fn slow(Query(q): Query<SlowQ>) -> String {
    tokio::time::sleep(Duration::from_millis(q.ms)).await;
    format!("slept {} ms\n", q.ms)
}

async fn stats(State(st): State<Arc<AppState>>) -> Json<Stats> {
    Json(Stats {
        requests: st.requests.load(Ordering::Relaxed),
        tokens_counted: st.tokens_counted.load(Ordering::Relaxed),
    })
}
