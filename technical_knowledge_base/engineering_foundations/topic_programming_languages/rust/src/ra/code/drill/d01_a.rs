use std::collections::HashMap;
fn main() {
    let text = "the cat and the hat";
    let mut counts: HashMap<&str, i32> = HashMap::new();
    for w in text.split_whitespace() {
        counts[w] += 1;
    }
    println!("{} {}", counts["the"], counts["cat"]);
}
