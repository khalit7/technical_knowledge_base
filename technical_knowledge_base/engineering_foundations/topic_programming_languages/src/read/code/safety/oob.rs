fn main() {
    let top = vec![9491, 4816, 3499];
    let i = std::env::args().count() + 4;   // 5, computed at run time
    println!("get(5) = {:?}", top.get(i));  // the checked way: Option
    println!("top[5] = {}", top[i]);        // indexing is always bounds-checked: panic
}
