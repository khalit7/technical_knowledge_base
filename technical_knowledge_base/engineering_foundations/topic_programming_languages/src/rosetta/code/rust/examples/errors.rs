// Task: report why each malformed line fails, then let one error escape.
use serde::Deserialize;
use std::fs;

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct Message {
    user: String,
    text: String,
}

// The error is part of the return type: callers must deal with it.
fn parse(line: &str) -> Result<Message, String> {
    let m: Message = serde_json::from_str(line).map_err(|e| format!("invalid: {e}"))?;
    Ok(m)
}

fn main() {
    let path = std::env::args().nth(1).expect("usage: errors <file>");
    let data = fs::read_to_string(&path).expect("cannot read file");
    for (i, line) in data.lines().enumerate() {
        if let Err(e) = parse(line) {
            println!("line {}: {e}", i + 1);
        }
    }
    println!("now with .unwrap():");
    let m = parse("not json at all").unwrap();
    println!("{m:?}");
}
