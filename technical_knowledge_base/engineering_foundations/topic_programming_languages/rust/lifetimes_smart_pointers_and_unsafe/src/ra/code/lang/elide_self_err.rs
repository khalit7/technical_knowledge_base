struct Vocab {
    name: String,
}

impl Vocab {
    // Elision rule 3: with &self, the returned reference is assumed to borrow from self.
    fn pick(&self, other: &str) -> &str {
        if other.is_empty() { &self.name } else { other }
    }
}

fn main() {
    let v = Vocab { name: "gpt2".into() };
    println!("{}", v.pick("cl100k"));
}
