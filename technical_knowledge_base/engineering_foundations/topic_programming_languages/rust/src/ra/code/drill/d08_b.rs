fn main() {
    let nums = vec![1, 2, 3];
    for mut x in nums.clone() {
        x *= 10;
    }
    println!("{nums:?}");
}
