// Count how many machine-code copies a generic function gets.
#[inline(never)]
fn biggest<T: PartialOrd + Copy>(xs: &[T]) -> T {
    let mut b = xs[0];
    for &x in xs { if x > b { b = x; } }
    b
}

#[inline(never)]
fn biggest_dyn(xs: &[&dyn Fn() -> f64]) -> f64 {
    xs.iter().map(|f| f()).fold(f64::MIN, f64::max)
}

fn main() {
    use std::hint::black_box; // hide the inputs so the optimiser cannot precompute the answers
    println!("{} {} {} {}", biggest(black_box(&[1u8, 7, 3])), biggest(black_box(&[1i64, -7, 3])),
        biggest(black_box(&[1.5f64, 0.5])), biggest(black_box(&['a', 'z'])));
    let one = || 1.0; let two = || 2.0;
    println!("{}", biggest_dyn(&[&one, &two]));
}
