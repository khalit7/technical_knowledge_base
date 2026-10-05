//! Per-user totals.
use crate::tokenize::count_tokens;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Deserialize)]
struct Message {
    user: String,
    text: String,
}

/// The result of reading a log.
#[derive(Debug, Default)]
pub struct Tally {
    pub lines: u64,
    pub ok: u64,
    pub malformed: u64,
    pub first_bad: Option<u64>,
    per_user: HashMap<String, u64>, // private field: only this module can touch it
}

impl Tally {
    /// Feed one line of the log.
    pub fn add_line(&mut self, line: &str) {
        self.lines += 1;
        match serde_json::from_str::<Message>(line) {
            Ok(m) => {
                self.ok += 1;
                *self.per_user.entry(m.user).or_insert(0) += count_tokens(&m.text);
            }
            Err(_) => {
                self.malformed += 1;
                self.first_bad.get_or_insert(self.lines);
            }
        }
    }

    pub fn users(&self) -> usize {
        self.per_user.len()
    }

    pub fn total(&self) -> u64 {
        self.per_user.values().sum()
    }

    /// The k heaviest users: count descending, then user id ascending.
    pub fn top(&self, k: usize) -> Vec<(&str, u64)> {
        let mut v: Vec<(&str, u64)> = self.per_user.iter().map(|(u, n)| (u.as_str(), *n)).collect();
        v.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(b.0)));
        v.truncate(k);
        v
    }
}
