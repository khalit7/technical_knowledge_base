struct Batch {
    items: Vec<String>,
    seen: usize,
}

impl Batch {
    fn mark(&mut self) {
        self.seen += 1;
    }
    fn process(&mut self) {
        for item in &self.items {
            self.mark();
            println!("{item}");
        }
    }
}

fn main() {
    let mut b = Batch { items: vec!["x".into()], seen: 0 };
    b.process();
    println!("{}", b.seen);
}
