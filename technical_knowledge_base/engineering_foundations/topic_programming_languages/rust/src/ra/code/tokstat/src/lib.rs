//! Count tokens per user in a JSONL chat log (the root page's running program),
//! split into modules so that each part can be tested on its own.

pub mod tally;
pub mod tokenize;

// Re-export: users of the crate write tokstat::count_tokens.
pub use tokenize::count_tokens;
