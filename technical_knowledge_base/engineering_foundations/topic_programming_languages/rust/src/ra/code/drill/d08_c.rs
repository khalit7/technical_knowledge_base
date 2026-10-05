fn main() {
    let mut nums = vec![1, 2, 3];
    for x in nums.iter_mut() {
        *x *= 10;
    }
    println!("{nums:?}");
}
