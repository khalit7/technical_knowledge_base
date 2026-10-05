fn greet(name: Option<&str>) -> String {
    format!("hi {}", name.unwrap_or("there"))
}

fn main() {
    println!("{} / {}", greet(None), greet(Some("ada")));
}
