fn main() {
    let mut nums = vec![1, 2, 3];
    for (i, x) in nums.iter().enumerate() {
        nums[i] = x * 10;
    }
    println!("{nums:?}");
}
