fn count(s: String) -> usize {
    s.split_whitespace().count()
}

fn main() {
    let prompt = String::from("explain the borrow checker");
    let n = count(prompt);
    println!("{n} words in {prompt}");
}
