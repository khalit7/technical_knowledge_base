#[derive(Debug)]
struct Message {
    user: String,
    text: String,
}

fn store(log: &mut Vec<Message>, m: Message) {
    log.push(m); // the vector now owns m
}

fn main() {
    let mut log = Vec::new();
    let m = Message { user: "u0029".into(), text: "hi".into() };
    store(&mut log, m);
    println!("{} said {}", m.user, m.text); // Python habit: m is still usable
}
