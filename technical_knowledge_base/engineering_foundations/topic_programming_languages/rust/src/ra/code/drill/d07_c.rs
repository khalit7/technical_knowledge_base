fn main() {
    let v: Vec<i32> = (1..5).filter(|x| x % 2 == 0).map(|x| x * x).collect();
    println!("{v:?}");
}
