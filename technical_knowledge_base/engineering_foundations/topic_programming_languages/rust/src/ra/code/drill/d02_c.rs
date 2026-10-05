fn main() {
    let mut a = vec![1, 2];
    let b = &mut a;
    b.push(3);
    println!("{a:?}");
}
