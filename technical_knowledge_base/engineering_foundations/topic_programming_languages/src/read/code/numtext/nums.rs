fn main() {
    let big: i64 = i64::MAX;
    let one: i64 = std::env::args().count() as i64; // 1, but unknown to the compiler
    println!("checked_add: {:?}  wrapping_add: {}", big.checked_add(one), big.wrapping_add(one));
    println!("-7 / 2 = {}   -7 % 2 = {}   (-7i32).div_euclid(2) = {}", -7 / 2, -7 % 2, (-7i32).div_euclid(2));
    println!("0.1 + 0.2 = {}", 0.1 + 0.2);
    let s = "café 日本 😀";
    println!("len: {} bytes   chars: {}", s.len(), s.chars().count());
    println!("big + 1 = {}", big + one);           // debug build: panics; release build: wraps
}
