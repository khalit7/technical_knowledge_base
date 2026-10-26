fn greet(name: Option<&str>) -> String {
    format!("hi {}", name.unwrap())
}

fn main() {
    println!("{} / {}", greet(None), greet(Some("ada")));
}
