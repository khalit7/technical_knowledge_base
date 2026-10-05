// flags: -O
fn main() {
    let x: i32 = i32::MAX - 1 + std::env::args().count() as i32; // i32::MAX at run time
    println!("{:?} {} {:?}", x.checked_add(1), x.wrapping_add(1), x.overflowing_add(1));
    println!("{} {} {}", -7 / 2, -7 % 2, (-7i32).rem_euclid(2));
    println!("{}", x + 1);   // debug build: panics; release build: wraps
}
