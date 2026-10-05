struct Message {
    user: String,
    text: String,
}

fn owner(m: &Message) -> &str {
    &m.usr // typo
}

fn main() {
    let m = Message { user: "u0029".into(), text: "hi".into() };
    println!("{} {}", owner(&m), m.text);
}
