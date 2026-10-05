use std::collections::HashMap;
use std::fmt;
use std::num::ParseIntError;

#[derive(Debug)]
enum ConfigError {
    Missing(&'static str),
    BadNumber { key: &'static str, source: ParseIntError },
}

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ConfigError::Missing(k) => write!(f, "missing key {k}"),
            ConfigError::BadNumber { key, source } => write!(f, "{key} is not a number: {source}"),
        }
    }
}

impl std::error::Error for ConfigError {}

fn get_num(cfg: &HashMap<&str, &str>, key: &'static str) -> Result<u32, ConfigError> {
    let raw = cfg.get(key).ok_or(ConfigError::Missing(key))?; // Option -> Result, then ?
    raw.trim()
        .parse::<u32>()
        .map_err(|e| ConfigError::BadNumber { key, source: e })
}

fn budget(cfg: &HashMap<&str, &str>) -> Result<u32, ConfigError> {
    let ctx = get_num(cfg, "context")?; // ? returns the error to our caller
    let out = get_num(cfg, "max_output")?;
    Ok(ctx - out)
}

fn main() {
    let good = HashMap::from([("context", "8192"), ("max_output", " 1024")]);
    let bad = HashMap::from([("context", "8k"), ("max_output", "1024")]);
    let missing = HashMap::from([("context", "8192")]);
    for cfg in [&good, &bad, &missing] {
        match budget(cfg) {
            Ok(n) => println!("ok: {n} tokens for the prompt"),
            Err(e) => println!("error: {e}   (debug: {e:?})"),
        }
    }
    let first: Option<&str> = "".split_whitespace().next();
    println!("first word of \"\": {:?}, or default: {}", first, first.unwrap_or("<none>"));
    let n: Result<u8, _> = "300".parse::<u8>();
    println!("\"300\".parse::<u8>() = {n:?}");
    let x: u32 = "12".parse().unwrap(); // fine
    println!("unwrap ok: {x}");
    let y: u32 = "twelve".parse().expect("config value must be a number"); // panics
    println!("{y}");
}
