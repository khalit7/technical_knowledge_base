use std::collections::HashMap;
use std::thread;

fn main() {
    let mut counts: HashMap<&str, u64> = HashMap::from([("u0029", 0)]);
    thread::scope(|s| {
        for _ in 0..4 {
            s.spawn(|| {
                for _ in 0..200_000 {
                    *counts.get_mut("u0029").unwrap() += 1; // no lock
                }
            });
        }
    });
    println!("{}", counts["u0029"]);
}
