fn main() {
    let a: i32 = 1;
    let b: i64 = 1 << 40;
    println!("{}", a + b);       // no implicit widening between integer types
}
