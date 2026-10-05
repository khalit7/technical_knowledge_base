struct Chunk {
    text: &str,
    start: usize,
}

fn main() {
    let doc = String::from("a long document");
    let c = Chunk { text: &doc[0..6], start: 0 };
    println!("{} at {}", c.text, c.start);
}
