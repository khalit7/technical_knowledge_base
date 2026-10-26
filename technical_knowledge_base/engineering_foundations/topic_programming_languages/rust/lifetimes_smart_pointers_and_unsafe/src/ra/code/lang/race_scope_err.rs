use std::thread;

fn main() {
    let mut counter = 0u64;
    thread::scope(|s| {
        for _ in 0..8 {
            s.spawn(|| for _ in 0..100_000 { counter += 1; });
        }
    });
    println!("{counter}");
}
