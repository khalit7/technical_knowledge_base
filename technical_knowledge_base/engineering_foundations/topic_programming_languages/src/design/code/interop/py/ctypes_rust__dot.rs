#[unsafe(no_mangle)]
pub extern "C" fn dot(a: *const f64, b: *const f64, n: usize) -> f64 {
    let (a, b) = unsafe { (std::slice::from_raw_parts(a, n), std::slice::from_raw_parts(b, n)) };
    a.iter().zip(b).map(|(x, y)| x * y).sum()
}
