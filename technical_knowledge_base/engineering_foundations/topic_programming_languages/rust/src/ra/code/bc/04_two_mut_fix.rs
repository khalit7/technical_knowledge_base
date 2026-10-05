fn main() {
    let mut weights = vec![1.0, 2.0, 3.0];
    weights.swap(0, 2); // the method takes one &mut and both indexes
    let (left, right) = weights.split_at_mut(2); // or: two non-overlapping &mut halves
    std::mem::swap(&mut left[1], &mut right[0]);
    println!("{weights:?}");
}
