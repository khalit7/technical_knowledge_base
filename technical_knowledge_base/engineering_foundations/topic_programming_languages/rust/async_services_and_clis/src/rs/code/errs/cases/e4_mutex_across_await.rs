// Holding a std::sync::MutexGuard across an .await: the guard is not Send,
// and even on one thread it would block every other task that wants the lock.
use std::sync::{Arc, Mutex};
use std::time::Duration;

#[tokio::main]
async fn main() {
    let hits = Arc::new(Mutex::new(0u64));
    let h = {
        let hits = hits.clone();
        tokio::spawn(async move {
            let mut n = hits.lock().unwrap();
            tokio::time::sleep(Duration::from_millis(10)).await; // still holding the lock
            *n += 1;
        })
    };
    h.await.unwrap();
    println!("{}", hits.lock().unwrap());
}
