use std::thread;

fn main() {
    let mut counter = 0u64;
    let mut hs = vec![];
    for _ in 0..8 {
        hs.push(thread::spawn(|| for _ in 0..100_000 { counter += 1; }));
    }
    for h in hs { h.join().unwrap(); }
    println!("{counter}");
}
