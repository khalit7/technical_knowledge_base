fn main() {
    let mut scores = vec![0.9, 0.4];
    let best = scores[0]; // f64 is Copy: take the value, not a reference
    scores.push(0.7);
    println!("best {best} of {scores:?}");
}
