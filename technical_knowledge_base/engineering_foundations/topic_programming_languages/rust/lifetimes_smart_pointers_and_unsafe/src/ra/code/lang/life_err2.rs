fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}

fn main() {
    let a = String::from("tokens");
    let w;
    {
        let b = String::from("logits!");
        w = longest(&a, &b);
    } // b is freed here
    println!("{w}");
}
