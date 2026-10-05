fn main() {
    // read the value at run time so the compiler cannot see the overflow coming
    let x: u8 = std::env::args().nth(1).unwrap().parse().unwrap();
    println!("checked_add:    {:?}", x.checked_add(1));
    println!("wrapping_add:   {}", x.wrapping_add(1));
    println!("saturating_add: {}", x.saturating_add(1));
    println!("overflowing_add:{:?}", x.overflowing_add(1));
    let y = x + 1; // plain +: panics in a debug build, wraps in a release build
    println!("x + 1 = {y}");
}
