// The Python page's fan-out, in tokio: 20 calls to a local server that answers GET /slow?ms=100
// after 100 ms (the service from src/service.rs, standing in for a model API).
// The client speaks raw HTTP/1.1 over TCP, like the Python version's asyncio.open_connection.
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::sync::Semaphore;
use tokio::task::JoinSet;

async fn get(addr: std::net::SocketAddr, path: String) -> String {
    let mut s = TcpStream::connect(addr).await.unwrap();
    s.write_all(format!("GET {path} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n").as_bytes()).await.unwrap();
    let mut raw = String::new();
    s.read_to_string(&mut raw).await.unwrap(); // until the server closes
    raw.split("\r\n\r\n").nth(1).unwrap_or("").trim().to_string()
}

#[tokio::main]
async fn main() {
    let cfg = tok::service::Config { max_body_bytes: 1 << 20, request_timeout: Duration::from_secs(5), offload: true };
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, tok::service::app(cfg)).await.unwrap() });

    let t = Instant::now();
    for _ in 0..20 {
        get(addr, "/slow?ms=100".into()).await; // one after another
    }
    println!("sequential, 20 calls      {:6.3} s", t.elapsed().as_secs_f64());

    let t = Instant::now();
    let mut set = JoinSet::new(); // like asyncio.TaskGroup: owns its tasks, aborts them when dropped
    for _ in 0..20 {
        set.spawn(get(addr, "/slow?ms=100".into()));
    }
    let bodies = set.join_all().await;
    println!("JoinSet, 20 at once       {:6.3} s   {:?}", t.elapsed().as_secs_f64(), bodies[0]);

    let t = Instant::now();
    let limit = Arc::new(Semaphore::new(5)); // at most 5 in flight
    let mut set = JoinSet::new();
    for _ in 0..20 {
        let limit = limit.clone();
        set.spawn(async move {
            let _permit = limit.acquire().await.unwrap(); // released when dropped
            get(addr, "/slow?ms=100".into()).await
        });
    }
    set.join_all().await;
    println!("JoinSet, at most 5        {:6.3} s", t.elapsed().as_secs_f64());

    let t = Instant::now();
    let r = tokio::time::timeout(Duration::from_millis(250), get(addr, "/slow?ms=2000".into())).await;
    println!("timeout after             {:6.3} s   {}", t.elapsed().as_secs_f64(), if r.is_err() { "Elapsed" } else { "ok" });
}
