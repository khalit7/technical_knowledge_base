fn pick<'a>(a: &'a str, b: &'a str, first: bool) -> &'a str {
    if first { a } else { b }
}

fn main() {
    println!("{}", pick("x", "y", true));
}
