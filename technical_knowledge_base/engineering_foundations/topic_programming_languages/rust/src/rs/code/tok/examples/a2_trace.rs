// The Python page's asyncio trace, in tokio: three jobs A, B, C that wait 100, 200, 300 ms,
// run five ways. Every event is stamped with ms since the run started and the OS thread.
// Prints one summary line per mode; with a path argument, writes all events as JSON.
use std::sync::Mutex;
use std::time::{Duration, Instant};

static EV: Mutex<Vec<(String, &'static str, f64, String, String)>> = Mutex::new(Vec::new());
static T0: Mutex<Option<Instant>> = Mutex::new(None);

fn ev(who: &str, what: &'static str, note: &str) {
    let t = T0.lock().unwrap().unwrap().elapsed().as_secs_f64() * 1000.0;
    let name = format!("{:?}", std::thread::current().id()).replace("ThreadId(", "thread ").replace(')', "");
    EV.lock().unwrap().push((who.into(), what, (t * 10.0).round() / 10.0, note.into(), name));
}

async fn job(name: &str, ms: u64) -> String {
    ev(name, "start", "");
    ev(name, "await", &format!("sleep({ms} ms).await"));
    tokio::time::sleep(Duration::from_millis(ms)).await; // yields to the runtime
    ev(name, "resume", "");
    ev(name, "done", "");
    name.into()
}

async fn job_blocking(name: &str, ms: u64) -> String {
    ev(name, "start", "");
    ev(name, "block", &format!("std::thread::sleep({ms} ms)"));
    std::thread::sleep(Duration::from_millis(ms)); // blocks the worker thread: nothing else runs on it
    ev(name, "done", "");
    name.into()
}

async fn job_offload(name: &str, ms: u64) -> String {
    ev(name, "start", "");
    ev(name, "await", &format!("spawn_blocking(sleep {ms} ms).await"));
    tokio::task::spawn_blocking(move || std::thread::sleep(Duration::from_millis(ms))).await.unwrap();
    ev(name, "resume", "");
    ev(name, "done", "");
    name.into()
}

fn run(mode: &str, multi: bool) -> serde_json::Value {
    EV.lock().unwrap().clear();
    let rt = if multi {
        tokio::runtime::Builder::new_multi_thread().worker_threads(4).enable_all().build()
    } else {
        tokio::runtime::Builder::new_current_thread().enable_all().build()
    }
    .unwrap();
    *T0.lock().unwrap() = Some(Instant::now());
    let res: Vec<String> = rt.block_on(async {
        match mode {
            "sequential" => vec![job("A", 100).await, job("B", 200).await, job("C", 300).await],
            "join" => {
                let (a, b, c) = tokio::join!(job("A", 100), job("B", 200), job("C", 300));
                vec![a, b, c]
            }
            "join_blocking" => {
                let (a, b, c) = tokio::join!(job("A", 100), job_blocking("B", 200), job("C", 300));
                vec![a, b, c]
            }
            "join_offload" => {
                let (a, b, c) = tokio::join!(job("A", 100), job_offload("B", 200), job("C", 300));
                vec![a, b, c]
            }
            // Three spawned tasks on a 4-worker runtime: B still blocks, but only its own worker.
            "spawn_blocking_multi" => {
                let a = tokio::spawn(job("A", 100));
                let b = tokio::spawn(job_blocking("B", 200));
                let c = tokio::spawn(job("C", 300));
                vec![a.await.unwrap(), b.await.unwrap(), c.await.unwrap()]
            }
            _ => unreachable!(),
        }
    });
    let total = T0.lock().unwrap().unwrap().elapsed().as_secs_f64() * 1000.0;
    drop(rt);
    let evs = EV.lock().unwrap().clone();
    let order: Vec<String> = evs.iter().map(|e| format!("{}:{}", e.0, e.1)).collect();
    println!("{mode:21} {total:6.1} ms  order of events: {}", order.join(" "));
    serde_json::json!({ "events": evs, "total_ms": (total * 10.0).round() / 10.0, "result": res })
}

fn main() {
    let mut out = serde_json::Map::new();
    for (mode, multi) in [
        ("sequential", false),
        ("join", false),
        ("join_blocking", false),
        ("join_offload", false),
        ("spawn_blocking_multi", true),
    ] {
        out.insert(mode.into(), run(mode, multi));
    }
    if let Some(p) = std::env::args().nth(1) {
        std::fs::write(p, serde_json::to_string(&out).unwrap()).unwrap();
    }
}
