// Count tokens per user in a JSONL chat log; print the top 5. Spec: ../../../PROGRAM.md
use serde::Deserialize;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::process::ExitCode;

// The shape we expect on each line. serde checks it while parsing:
// a missing field, or a field that is not a string, is an Err.
// Unknown fields (ts, role) are ignored.
#[derive(Deserialize)]
struct Message {
    user: String,
    text: String,
}

/// Number of maximal runs of ASCII letters and digits.
fn count_tokens(text: &str) -> u64 {
    let mut n = 0;
    let mut inside = false;
    for b in text.bytes() {
        let tok = b.is_ascii_alphanumeric();
        if tok && !inside {
            n += 1;
        }
        inside = tok;
    }
    n
}

fn main() -> ExitCode {
    let path = std::env::args().nth(1).unwrap_or_else(|| "chat.jsonl".to_string());
    let file = match File::open(&path) {
        Ok(f) => f,
        Err(e) => {
            eprintln!("error: cannot open {path}: {e}");
            return ExitCode::from(1);
        }
    };
    let mut per_user: HashMap<String, u64> = HashMap::new();
    let (mut lines, mut ok, mut bad, mut first_bad) = (0u64, 0u64, 0u64, 0u64);
    for line in BufReader::new(file).lines() {
        lines += 1;
        let parsed = line
            .map_err(|e| e.to_string())
            .and_then(|l| serde_json::from_str::<Message>(&l).map_err(|e| e.to_string()));
        match parsed {
            Ok(m) => {
                ok += 1;
                *per_user.entry(m.user).or_insert(0) += count_tokens(&m.text);
            }
            Err(_) => {
                bad += 1;
                if first_bad == 0 {
                    first_bad = lines;
                }
            }
        }
    }
    let total: u64 = per_user.values().sum();
    let mut top: Vec<(&String, &u64)> = per_user.iter().collect();
    top.sort_by(|a, b| b.1.cmp(a.1).then(a.0.cmp(b.0)));
    println!("lines {lines}  ok {ok}  malformed {bad} (first at line {first_bad})");
    println!("users {}  tokens {total}", per_user.len());
    println!("top 5 users by tokens:");
    for (rank, (user, n)) in top.iter().take(5).enumerate() {
        println!("{:>2}. {user}  {n}", rank + 1);
    }
    ExitCode::SUCCESS
}
