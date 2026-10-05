fn greeting(name: &str) -> &String {
    let s = format!("hello {name}");
    &s
}

fn main() {
    println!("{}", greeting("ada"));
}
