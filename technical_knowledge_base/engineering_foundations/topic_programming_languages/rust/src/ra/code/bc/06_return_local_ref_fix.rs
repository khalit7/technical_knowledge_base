fn greeting(name: &str) -> String {
    format!("hello {name}") // return the owned value; the caller owns it now
}

fn main() {
    println!("{}", greeting("ada"));
}
