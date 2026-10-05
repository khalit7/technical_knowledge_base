struct Chunk<'a> {
    text: &'a str, // a Chunk may not outlive the document it points into
    start: usize,
}

struct OwnedChunk {
    text: String, // often simpler: own the text, no lifetime needed
    start: usize,
}

fn main() {
    let doc = String::from("a long document");
    let c = Chunk { text: &doc[0..6], start: 0 };
    let o = OwnedChunk { text: doc[7..].to_string(), start: 7 };
    println!("{} at {}; {} at {}", c.text, c.start, o.text, o.start);
}
