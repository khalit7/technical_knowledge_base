// Task: one generic top_k used for two different element types.
fn top_k<T: Clone, K: Ord>(items: &[T], k: usize, key: impl Fn(&T) -> K) -> Vec<T> {
    let mut v = items.to_vec();
    v.sort_by(|a, b| key(b).cmp(&key(a)));
    v.truncate(k);
    v
}

fn main() {
    let counts = [("u0005", 4816), ("u0029", 9491), ("u0042", 3499)];
    println!("{:?}", top_k(&counts, 2, |kv| kv.1));
    let words = ["kernel", "a", "attention", "GPU"];
    println!("{:?}", top_k(&words, 2, |w| w.len()));
}
