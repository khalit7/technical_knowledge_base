fn main() {
    let n: i32 = "12a".parse().unwrap_or(0);
    println!("{n}");
}
