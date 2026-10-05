trait Tokenizer {
    fn count(&self, text: &str) -> usize;
}

struct Whitespace;

fn total<T: Tokenizer>(t: &T, docs: &[&str]) -> usize {
    docs.iter().map(|d| t.count(d)).sum()
}

fn main() {
    println!("{}", total(&Whitespace, &["a b"]));
}
