fn main() {
    let v = (0..5).filter(|x| x % 2 == 0).map(|x| x * x);
    println!("{v:?}");
}
