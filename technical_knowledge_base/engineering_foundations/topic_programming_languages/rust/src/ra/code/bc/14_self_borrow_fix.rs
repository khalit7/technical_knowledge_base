struct Batch {
    items: Vec<String>,
    seen: usize,
}

impl Batch {
    fn process(&mut self) {
        for item in &self.items {
            self.seen += 1; // touch the field directly: borrows of different fields do not conflict
            println!("{item}");
        }
    }
}

fn main() {
    let mut b = Batch { items: vec!["x".into(), "y".into()], seen: 0 };
    b.process();
    println!("{}", b.seen);
}
