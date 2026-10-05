use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // 1. spawn + join; `move` gives the thread its own copy of what it uses
    let docs = vec!["a b c", "d e", "f"];
    let handles: Vec<_> = docs.into_iter().enumerate().map(|(i, d)| {
        thread::spawn(move || (i, d.split_whitespace().count()))
    }).collect();
    let counts: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();
    println!("spawned: {counts:?}");

    // 2. scoped threads may borrow local data, because they are joined before the scope ends
    let data = vec![1u64; 1_000_000];
    let (left, right) = data.split_at(data.len() / 2);
    let total = thread::scope(|s| {
        let a = s.spawn(|| left.iter().sum::<u64>());
        let b = s.spawn(|| right.iter().sum::<u64>());
        a.join().unwrap() + b.join().unwrap()
    });
    println!("scoped sum: {total}");

    // 3. shared mutable state: Arc (shared ownership across threads) + Mutex (one writer at a time)
    let counter = Arc::new(Mutex::new(0u64));
    let mut hs = vec![];
    for _ in 0..8 {
        let c = Arc::clone(&counter);
        hs.push(thread::spawn(move || for _ in 0..100_000 { *c.lock().unwrap() += 1; }));
    }
    for h in hs { h.join().unwrap(); }
    println!("mutex counter: {} (expected 800000)", *counter.lock().unwrap());

    // 4. an atomic does the same without a lock
    let hits = Arc::new(AtomicU64::new(0));
    thread::scope(|s| for _ in 0..8 { let h = &hits; s.spawn(move || for _ in 0..100_000 { h.fetch_add(1, Ordering::Relaxed); }); });
    println!("atomic counter: {}", hits.load(Ordering::Relaxed));

    // 5. channels: send values from many producers to one consumer
    let (tx, rx) = mpsc::channel();
    for id in 0..3 {
        let tx = tx.clone();
        thread::spawn(move || tx.send(format!("worker {id} done")).unwrap());
    }
    drop(tx); // close our copy so the loop below ends when the workers finish
    let mut got: Vec<String> = rx.iter().collect();
    got.sort();
    println!("channel: {got:?}");
}
