mod tokenizer {
    pub fn count(text: &str) -> usize {
        split(text).len()
    }
    fn split(text: &str) -> Vec<&str> {
        text.split_whitespace().collect()
    }
}

fn main() {
    println!("{}", tokenizer::count("a b c"));
    println!("{:?}", tokenizer::split("a b c"));
}
