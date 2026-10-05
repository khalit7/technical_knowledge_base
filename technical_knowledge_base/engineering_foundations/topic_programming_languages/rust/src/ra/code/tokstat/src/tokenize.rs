//! What counts as a token.

/// Number of maximal runs of ASCII letters and digits.
///
/// ```
/// use tokstat::count_tokens;
/// assert_eq!(count_tokens("x86_64 is 2 tokens"), 5);
/// assert_eq!(count_tokens("café"), 1); // 'é' is not ASCII, so it separates
/// ```
pub fn count_tokens(text: &str) -> u64 {
    let mut n = 0;
    let mut inside = false;
    for b in text.bytes() {
        let tok = is_token_byte(b);
        if tok && !inside {
            n += 1;
        }
        inside = tok;
    }
    n
}

// Private: not visible outside this module.
fn is_token_byte(b: u8) -> bool {
    b.is_ascii_alphanumeric()
}

#[cfg(test)]
mod tests {
    use super::*; // unit tests may see private items

    #[test]
    fn private_helper() {
        assert!(is_token_byte(b'a'));
        assert!(!is_token_byte(b'_'));
    }

    #[test]
    fn edge_cases() {
        assert_eq!(count_tokens(""), 0);
        assert_eq!(count_tokens("日本語"), 0);
        assert_eq!(count_tokens("v2.1"), 2);
    }
}
