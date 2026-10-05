fn main() {
    let mut weights = vec![1.0, 2.0, 3.0];
    let a = &mut weights[0];
    let b = &mut weights[2];
    std::mem::swap(a, b);
    println!("{weights:?}");
}
