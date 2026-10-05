fn find(key: &str) -> Option<&'static str> {
    if key == "a" { Some("Ada") } else { None }
}
fn main() {
    let name = find("b");
    println!("{}", name.unwrap_or("nobody"));   // handle the None case
    println!("{}", name.to_uppercase());        // Option<&str> is not a &str
}
