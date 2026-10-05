fn twice(x: i64) -> i64 {
    2 * x
}

fn main() {
    let n: i32 = 21;
    println!("{}", twice(n)); // i32 is not i64: no silent widening
}
