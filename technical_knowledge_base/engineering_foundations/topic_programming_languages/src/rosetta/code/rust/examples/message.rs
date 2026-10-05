// Task: a Message type; what happens when you copy it and change the copy.
#[derive(Debug, Clone)]
struct Message {
    user: String,
    text: String,
}

impl Message {
    fn tokens(&self) -> usize {
        self.text
            .split(|c: char| !c.is_ascii_alphanumeric())
            .filter(|w| !w.is_empty())
            .count()
    }
}

fn main() {
    let a = Message { user: "u0029".into(), text: "hello world".into() };
    let mut b = a.clone(); // an explicit, deep copy
    b.text = "changed".into();
    println!("{} {}", a.text, b.text);

    let c = a; // a MOVE: ownership passes to c, `a` can no longer be used
    println!("{c:?} {}", c.tokens());
    println!("{}", c.user.len());
}
