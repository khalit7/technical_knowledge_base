fn top_k<T: Clone + Ord>(items: &[T], k: usize) -> Vec<T> {
    let mut v = items.to_vec();
    v.sort_by(|a, b| b.cmp(a));
    v.truncate(k);
    v
}

fn main() {
    let scores = [0.5, f64::NAN, 2.0];
    println!("{:?}", top_k(&scores, 2)); // f64 is not Ord: NaN has no place in the order
}
