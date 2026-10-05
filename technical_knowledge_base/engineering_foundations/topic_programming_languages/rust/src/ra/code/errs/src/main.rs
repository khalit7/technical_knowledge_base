// A library-style typed error (thiserror) under an application-style error (anyhow).
use anyhow::{Context, Result};
use thiserror::Error;

#[derive(Debug, Error)]
enum ParseError {
    #[error("line {line}: missing field {field}")]
    MissingField { line: usize, field: &'static str },
    #[error("line {line}: bad token count")]
    BadCount { line: usize, #[source] source: std::num::ParseIntError },
}

// typed: callers can match on the variant
fn parse_line(line: usize, s: &str) -> Result<(String, u64), ParseError> {
    let mut it = s.split(',');
    let user = it.next().filter(|u| !u.is_empty()).ok_or(ParseError::MissingField { line, field: "user" })?;
    let n = it.next().ok_or(ParseError::MissingField { line, field: "tokens" })?;
    let n = n.trim().parse().map_err(|source| ParseError::BadCount { line, source })?;
    Ok((user.to_string(), n))
}

// application: any error, plus context explaining what we were doing
fn load(path: &str) -> Result<u64> {
    let text = std::fs::read_to_string(path).with_context(|| format!("reading {path}"))?;
    let mut total = 0;
    for (i, l) in text.lines().enumerate() {
        let (_, n) = parse_line(i + 1, l).context("parsing usage file")?;
        total += n;
    }
    Ok(total)
}

fn main() {
    std::fs::write("good.csv", "ada,10\nbob,32\n").unwrap();
    std::fs::write("bad.csv", "ada,10\nbob,thirty\n").unwrap();
    for p in ["good.csv", "bad.csv", "nope.csv"] {
        match load(p) {
            Ok(t) => println!("{p}: total {t}"),
            Err(e) => println!("{p}: error: {e:#}"), // {:#} prints the whole chain
        }
    }
    match parse_line(7, ",5") {
        Err(ParseError::MissingField { field, .. }) => println!("caller matched: missing {field}"),
        other => println!("{other:?}"),
    }
}
