fn main() {
    let mut v = vec![0.3, 0.1, 0.2];
    v.sort_by(|a, b| b.total_cmp(a));
    println!("{v:?}");
}
