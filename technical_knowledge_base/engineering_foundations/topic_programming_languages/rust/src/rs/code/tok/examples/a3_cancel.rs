// Timeouts, select!, and cancellation. In Rust, cancelling a future means dropping it:
// it is simply never polled again, so the code after its pending .await never runs.
use std::time::{Duration, Instant};
use tokio::time::{sleep, timeout};

/// Prints when it is dropped, to show exactly when a future is cancelled.
struct Guard(&'static str);
impl Drop for Guard {
    fn drop(&mut self) {
        println!("   drop: {} cleaned up", self.0);
    }
}

async fn step(name: &'static str, ms: u64) -> &'static str {
    let _g = Guard(name);
    println!("   {name}: started, waiting {ms} ms");
    sleep(Duration::from_millis(ms)).await;
    println!("   {name}: finished"); // never printed if the future is dropped first
    name
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let t = Instant::now();
    println!("1. timeout(250 ms) around a 2000 ms call");
    let r = timeout(Duration::from_millis(250), step("slow", 2000)).await;
    println!("   -> {r:?} after {} ms", t.elapsed().as_millis());

    println!("2. select!: first to finish wins, the other is dropped");
    let t = Instant::now();
    tokio::select! {
        w = step("fast", 100) => println!("   -> winner {w} after {} ms", t.elapsed().as_millis()),
        w = step("lazy", 300) => println!("   -> winner {w}"),
    }

    println!("3. a spawned task keeps running on its own; abort() cancels it");
    let h = tokio::spawn(step("background", 1000));
    sleep(Duration::from_millis(50)).await;
    h.abort();
    println!("   -> join: {:?}", h.await.map_err(|e| e.is_cancelled()));

    println!("4. dropping a JoinHandle does NOT cancel the task (it is detached)");
    drop(tokio::spawn(step("detached", 100)));
    sleep(Duration::from_millis(150)).await;
    println!("   -> main done");
}
