// Four threads each add 1 to a shared counter a million times: written the C++ way.
use std::thread;
fn main() {
    const N: u64 = 1_000_000;
    let mut counter: u64 = 0;
    thread::scope(|s| {
        for _ in 0..4 {
            s.spawn(|| for _ in 0..N { counter += 1; });
        }
    });
    println!("expected {}  got {counter}", 4 * N);
}
