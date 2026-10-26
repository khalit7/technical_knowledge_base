// The classic CLI bug: println! panics when the reader of a pipe goes away (`| head -1`).
fn main() {
    for i in 1..=100_000 {
        println!("line {i}");
    }
}
