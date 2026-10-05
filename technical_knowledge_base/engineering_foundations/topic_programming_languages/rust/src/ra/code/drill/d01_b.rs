use std::collections::HashMap;
fn main() {
    let text = "the cat and the hat";
    let mut counts: HashMap<&str, i32> = HashMap::new();
    for w in text.split_whitespace() {
        counts.insert(w, counts.get(w).unwrap() + 1);
    }
    println!("{} {}", counts["the"], counts["cat"]);
}
