struct Vocab {
    name: String,
}

impl Vocab {
    // Say it explicitly: the result may come from self or from other.
    fn pick<'a>(&'a self, other: &'a str) -> &'a str {
        if other.is_empty() { &self.name } else { other }
    }
}

fn main() {
    let v = Vocab { name: "gpt2".into() };
    println!("{}", v.pick("cl100k"));
    println!("{}", v.pick(""));
}
