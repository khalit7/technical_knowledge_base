use std::sync::atomic::{AtomicU64, Ordering};
fn main() {
    let n = AtomicU64::new(0);                 // shared counter that is safe to update
    std::thread::scope(|s| {
        for _ in 0..2 { s.spawn(|| for _ in 0..1_000_000 { n.fetch_add(1, Ordering::Relaxed); }); }
    });
    println!("{} of 2000000", n.into_inner());
}
