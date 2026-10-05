// 'a names "some region of the program". The signature promises: the result
// lives no longer than the shorter-lived of a and b.
fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}

// One input reference: the compiler fills in the lifetimes itself (elision).
fn first_word(s: &str) -> &str {
    s.split(' ').next().unwrap_or("")
}

// A struct that holds a reference must say how long it may live.
struct Token<'a> {
    text: &'a str,
}

fn main() {
    let a = String::from("tokens");
    let w;
    {
        let b = String::from("logits!");
        w = longest(&a, &b);
        println!("longest: {w}");
    }
    let t = Token { text: first_word("hello world") };
    let s: &'static str = "string literals live for the whole program";
    println!("{} | {}", t.text, s);
}
