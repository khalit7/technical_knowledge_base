fn main() {
    let mut v: Vec<f64> = vec![0.3, 0.1, 0.2];
    v.sort_by(|a, b| a.partial_cmp(b).unwrap());
    println!("{v:?}");
}
