fn pick(a: &str, b: &str, first: bool) -> &str {
    if first { a } else { b }
}

fn main() {
    println!("{}", pick("x", "y", true));
}
