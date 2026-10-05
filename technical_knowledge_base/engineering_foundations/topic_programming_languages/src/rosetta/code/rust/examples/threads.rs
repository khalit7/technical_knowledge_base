// Task: count tokens in 4 chunks on 4 threads, merge the per-user counts.
use serde::Deserialize;
use std::collections::HashMap;
use std::thread;

#[derive(Deserialize)]
struct Message {
    user: String,
    text: String,
}

fn count_tokens(text: &str) -> u64 {
    let (mut n, mut inside) = (0, false);
    for b in text.bytes() {
        let tok = b.is_ascii_alphanumeric();
        if tok && !inside {
            n += 1;
        }
        inside = tok;
    }
    n
}

fn main() {
    let path = std::env::args().nth(1).unwrap();
    let data = std::fs::read_to_string(path).unwrap();
    let lines: Vec<&str> = data.lines().collect();
    let chunks: Vec<&[&str]> = lines.chunks(lines.len().div_ceil(4)).collect();
    // Scoped threads may borrow `lines` because they are joined before it is dropped.
    let parts: Vec<HashMap<String, u64>> = thread::scope(|s| {
        let handles: Vec<_> = chunks
            .iter()
            .map(|chunk| {
                s.spawn(move || {
                    let mut m = HashMap::new();
                    for line in chunk.iter() {
                        if let Ok(msg) = serde_json::from_str::<Message>(line) {
                            *m.entry(msg.user).or_insert(0) += count_tokens(&msg.text);
                        }
                    }
                    m
                })
            })
            .collect();
        handles.into_iter().map(|h| h.join().unwrap()).collect()
    });
    let mut total: HashMap<String, u64> = HashMap::new();
    for part in parts {
        for (u, n) in part {
            *total.entry(u).or_insert(0) += n;
        }
    }
    let top = total.iter().max_by(|a, b| a.1.cmp(b.1).then(b.0.cmp(a.0))).unwrap();
    println!("users {} tokens {} top {:?}", total.len(), total.values().sum::<u64>(), top);
}
