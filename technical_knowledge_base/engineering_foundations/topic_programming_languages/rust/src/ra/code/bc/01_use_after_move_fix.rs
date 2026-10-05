fn count(s: &str) -> usize {
    s.split_whitespace().count()
}

fn main() {
    let prompt = String::from("explain the borrow checker");
    let n = count(&prompt); // lend it instead of giving it away
    println!("{n} words in {prompt}");
}
