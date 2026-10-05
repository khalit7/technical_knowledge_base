// Same loop as the Python: count maximal runs of ASCII letters and digits.
#[unsafe(no_mangle)]
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
