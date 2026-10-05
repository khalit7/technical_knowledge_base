//! tokserve: the token counter as an HTTP service (axum on tokio).
use clap::Parser;
use std::time::Duration;
use tok::service::{Config, app};
use tracing::info;

/// Serve the token counter over HTTP. Every flag can also come from the environment.
#[derive(Parser, Debug)]
#[command(name = "tokserve", version)]
struct Args {
    /// Address to listen on
    #[arg(long, env = "TOK_ADDR", default_value = "127.0.0.1:3000")]
    addr: String,
    /// Largest request body accepted, in bytes
    #[arg(long, env = "TOK_MAX_BODY", default_value_t = 1 << 20)]
    max_body: usize,
    /// Per-request time limit, in milliseconds
    #[arg(long, env = "TOK_TIMEOUT_MS", default_value_t = 1000)]
    timeout_ms: u64,
    /// Async worker threads (default: one per CPU core)
    #[arg(long, env = "TOK_WORKERS")]
    workers: Option<usize>,
    /// Count large bodies inline on the async worker instead of the blocking pool
    #[arg(long)]
    inline: bool,
}

fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    // Logs: RUST_LOG=info (default) or e.g. RUST_LOG=tower_http=debug for one line per request.
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();
    // What #[tokio::main] writes for you, spelled out so the worker count is configurable.
    let mut rt = tokio::runtime::Builder::new_multi_thread();
    if let Some(n) = args.workers {
        rt.worker_threads(n);
    }
    rt.enable_all().build()?.block_on(serve(args))
}

async fn serve(args: Args) -> anyhow::Result<()> {
    let cfg = Config {
        max_body_bytes: args.max_body,
        request_timeout: Duration::from_millis(args.timeout_ms),
        offload: !args.inline,
    };
    info!(?cfg, "starting");
    let listener = tokio::net::TcpListener::bind(&args.addr).await?;
    info!("listening on http://{}", listener.local_addr()?);
    axum::serve(listener, app(cfg))
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    info!("drained, bye");
    Ok(())
}

/// Resolves on Ctrl-C or SIGTERM (what `docker stop` and Kubernetes send).
/// After it resolves, axum stops accepting and waits for in-flight requests to finish.
async fn shutdown_signal() {
    let ctrl_c = async { tokio::signal::ctrl_c().await.expect("ctrl-c handler") };
    #[cfg(unix)]
    let term = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("SIGTERM handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let term = std::future::pending::<()>();
    tokio::select! {
        _ = ctrl_c => info!("Ctrl-C received, draining"),
        _ = term => info!("SIGTERM received, draining"),
    }
}
