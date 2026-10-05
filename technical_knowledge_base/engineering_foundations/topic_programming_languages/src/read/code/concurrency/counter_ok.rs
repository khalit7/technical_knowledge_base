// Two ways Rust accepts: a Mutex shared through an Arc, or an atomic.
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
fn main() {
    const N: u64 = 1_000_000;
    let counter = Arc::new(Mutex::new(0u64));        // Arc: shared ownership across threads
    let handles: Vec<_> = (0..4).map(|_| {
        let c = Arc::clone(&counter);
        thread::spawn(move || for _ in 0..N { *c.lock().unwrap() += 1; })
    }).collect();
    for h in handles { h.join().unwrap(); }
    println!("Arc<Mutex<u64>>: expected {}  got {}", 4 * N, *counter.lock().unwrap());

    let atomic = Arc::new(AtomicU64::new(0));
    let handles: Vec<_> = (0..4).map(|_| {
        let a = Arc::clone(&atomic);
        thread::spawn(move || for _ in 0..N { a.fetch_add(1, Ordering::Relaxed); })
    }).collect();
    for h in handles { h.join().unwrap(); }
    println!("AtomicU64:       expected {}  got {}", 4 * N, atomic.load(Ordering::Relaxed));
}
