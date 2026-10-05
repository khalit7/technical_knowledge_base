fn count_tokens(text: &str) -> u64 {
    let (mut n, mut inside) = (0, false);
    for b in text.bytes() {
        let tok = b.is_ascii_alphanumeric();
        if tok && !inside { n += 1; }
        inside = tok;
    }
    n
}
fn main() {
    println!("{}", count_tokens("x86_64 café"));
    println!("{}", count_tokens(42)); // wrong type
}
