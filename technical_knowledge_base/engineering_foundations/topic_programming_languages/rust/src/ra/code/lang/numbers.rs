fn main() {
    println!("i32 range       {} .. {}", i32::MIN, i32::MAX);
    println!("u64::MAX        {}", u64::MAX);
    println!("-7 / 2          {}", -7 / 2); // truncates toward zero
    println!("-7 % 2          {}", -7 % 2);
    println!("(-7i32).div_euclid(2) {}", (-7i32).div_euclid(2)); // Python's //
    println!("(-7i32).rem_euclid(2) {}", (-7i32).rem_euclid(2)); // Python's %
    println!("7 / 2           {}", 7 / 2); // integer division, no float
    println!("7.0 / 2.0       {}", 7.0 / 2.0);
    println!("0.1 + 0.2       {}", 0.1 + 0.2);
    println!("300i32 as u8    {}", 300i32 as u8); // `as` truncates silently
    println!("-1i32 as u32    {}", -1i32 as u32);
    println!("3.99f64 as i32  {}", 3.99f64 as i32);
    println!("1e20f64 as i32  {}", 1e20f64 as i32); // saturates
    println!("f64::NAN as i32 {}", f64::NAN as i32);
    println!("u8::try_from(300i32) {:?}", u8::try_from(300i32)); // the checked way
    let n: usize = 3; // sizes and indexes are usize (64 bits here)
    println!("usize bits      {}", usize::BITS);
    println!("2u64.pow(40)    {}", 2u64.pow(40));
    println!("n as f64 / 2.0  {}", n as f64 / 2.0); // no implicit int to float
}
