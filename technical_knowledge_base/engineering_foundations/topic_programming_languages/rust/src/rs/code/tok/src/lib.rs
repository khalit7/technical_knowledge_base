//! The root page's running program (count tokens per user in a JSONL chat log),
//! split into a library so a CLI (src/bin/tokcount.rs) and an HTTP service
//! (src/bin/tokserve.rs, src/service.rs) share one implementation.
//! Rules: ../../../../../src/rosetta/PROGRAM.md on the root page.
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub mod service;

/// Number of maximal runs of ASCII letters and digits (`[A-Za-z0-9]+`).
pub fn count_tokens(text: &str) -> u64 {
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

/// One line of the log. serde rejects a missing field or a non-string value.
#[derive(Deserialize)]
struct Message {
    user: String,
    text: String,
}

/// Running totals over any number of lines (one file, stdin, or a request body).
#[derive(Default, Debug)]
pub struct Tally {
    pub lines: u64,
    pub ok: u64,
    pub malformed: u64,
    pub first_malformed: u64,
    pub per_user: HashMap<String, u64>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Report {
    pub lines: u64,
    pub ok: u64,
    pub malformed: u64,
    pub first_malformed: u64,
    pub users: usize,
    pub tokens: u64,
    pub top: Vec<UserCount>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct UserCount {
    pub user: String,
    pub tokens: u64,
}

impl Tally {
    /// Feed one line (without its newline). Malformed lines are counted, never fatal.
    pub fn add_line(&mut self, line: &str) {
        self.lines += 1;
        match serde_json::from_str::<Message>(line) {
            Ok(m) => {
                self.ok += 1;
                *self.per_user.entry(m.user).or_insert(0) += count_tokens(&m.text);
            }
            Err(_) => {
                self.malformed += 1;
                if self.first_malformed == 0 {
                    self.first_malformed = self.lines;
                }
            }
        }
    }

    /// Feed a whole JSONL text (a request body).
    pub fn add_text(&mut self, body: &str) {
        for line in body.lines() {
            self.add_line(line);
        }
    }

    /// Users sorted by tokens descending, ties by user id ascending.
    pub fn report(&self, n: usize) -> Report {
        let mut top: Vec<(&String, &u64)> = self.per_user.iter().collect();
        top.sort_by(|a, b| b.1.cmp(a.1).then(a.0.cmp(b.0)));
        Report {
            lines: self.lines,
            ok: self.ok,
            malformed: self.malformed,
            first_malformed: self.first_malformed,
            users: self.per_user.len(),
            tokens: self.per_user.values().sum(),
            top: top.into_iter().take(n).map(|(u, c)| UserCount { user: u.clone(), tokens: *c }).collect(),
        }
    }
}

impl Report {
    /// The exact text format of the root page's program.
    pub fn to_text(&self) -> String {
        let mut s = format!(
            "lines {}  ok {}  malformed {} (first at line {})\nusers {}  tokens {}\ntop {} users by tokens:\n",
            self.lines, self.ok, self.malformed, self.first_malformed, self.users, self.tokens, self.top.len()
        );
        for (i, uc) in self.top.iter().enumerate() {
            s += &format!("{:>2}. {}  {}\n", i + 1, uc.user, uc.tokens);
        }
        s
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokens_follow_the_rules() {
        // The examples from the root page's PROGRAM.md rule 3.
        assert_eq!(count_tokens("x86_64"), 2);
        assert_eq!(count_tokens("café"), 1);
        assert_eq!(count_tokens("日本語"), 0);
        assert_eq!(count_tokens("v2.1"), 2);
        assert_eq!(count_tokens("C++"), 1);
    }

    #[test]
    fn malformed_lines_are_counted_not_fatal() {
        let mut t = Tally::default();
        t.add_text("{\"user\":\"a\",\"text\":\"hi there\"}\nnot json\n{\"user\":17,\"text\":\"x\"}\n");
        let r = t.report(5);
        assert_eq!((r.lines, r.ok, r.malformed, r.first_malformed), (3, 1, 2, 2));
        assert_eq!(r.top, vec![UserCount { user: "a".into(), tokens: 2 }]);
    }
}
