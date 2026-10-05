use std::collections::HashMap;
use std::sync::Mutex;
use std::thread;

fn main() {
    let counts = Mutex::new(HashMap::from([("u0029", 0u64)]));
    thread::scope(|s| {
        for _ in 0..4 {
            s.spawn(|| {
                for _ in 0..200_000 {
                    *counts.lock().unwrap().get_mut("u0029").unwrap() += 1;
                }
            });
        }
    });
    println!("expected 800000, got {}", counts.lock().unwrap()["u0029"]);
}
