use std::io::{BufRead, BufReader};
use std::process::ExitCode;
use tokstat::tally::Tally;

fn main() -> ExitCode {
    let path = std::env::args().nth(1).unwrap_or_else(|| "chat.jsonl".to_string());
    let file = match std::fs::File::open(&path) {
        Ok(f) => f,
        Err(e) => {
            eprintln!("error: cannot open {path}: {e}");
            return ExitCode::from(1);
        }
    };
    let mut t = Tally::default();
    for line in BufReader::new(file).lines() {
        match line {
            Ok(l) => t.add_line(&l),
            Err(_) => t.add_line(""), // unreadable bytes count as malformed
        }
    }
    println!("lines {}  ok {}  malformed {} (first at line {})", t.lines, t.ok, t.malformed, t.first_bad.unwrap_or(0));
    println!("users {}  tokens {}", t.users(), t.total());
    println!("top 5 users by tokens:");
    for (rank, (user, n)) in t.top(5).iter().enumerate() {
        println!("{:>2}. {user}  {n}", rank + 1);
    }
    ExitCode::SUCCESS
}
