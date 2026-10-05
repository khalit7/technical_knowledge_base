fn greet(name: &str = "there") -> String {
    format!("hi {name}")
}

fn main() {
    println!("{} / {}", greet(), greet("ada"));
}
