// What a panic in a handler does to the server: only that request's task dies.
use axum::{Router, routing::get};

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/boom", get(boom))
        .route("/health", get(|| async { "ok" }));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });

    for path in ["/boom", "/health", "/boom", "/health"] {
        let r = tokio::process::Command::new("curl")
            .args(["-s", "-o", "/dev/null", "-w", "%{http_code}", &format!("http://{addr}{path}")])
            .output()
            .await
            .unwrap();
        println!("GET {path:8} -> HTTP {} (curl exit {})", String::from_utf8_lossy(&r.stdout), r.status.code().unwrap());
    }
}

async fn boom() -> &'static str {
    let v: Vec<u32> = Vec::new();
    let _ = v[3]; // index out of bounds: panics
    "unreachable"
}
