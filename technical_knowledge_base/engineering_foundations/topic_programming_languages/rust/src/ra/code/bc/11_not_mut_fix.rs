fn normalise(v: &mut Vec<f32>) {
    let s: f32 = v.iter().sum();
    for x in v.iter_mut() {
        *x /= s;
    }
}

fn main() {
    let mut probs = vec![1.0, 3.0];
    normalise(&mut probs);
    println!("{probs:?}");
}
