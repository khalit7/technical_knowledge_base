// Is an iterator chain really as fast as a hand-written loop? Same work, five ways:
// sum of x*x over the even numbers in a Vec<u64> of 10 million pseudo-random values.
use std::hint::black_box;
use std::time::Instant;

#[inline(never)]
fn index_loop(v: &[u64]) -> u64 {
    let mut s = 0u64;
    let mut i = 0;
    while i < v.len() { let x = v[i]; if x % 2 == 0 { s = s.wrapping_add(x * x); } i += 1; }
    s
}
#[inline(never)]
fn for_loop(v: &[u64]) -> u64 {
    let mut s = 0u64;
    for &x in v { if x % 2 == 0 { s = s.wrapping_add(x * x); } }
    s
}
#[inline(never)]
fn chain(v: &[u64]) -> u64 {
    v.iter().filter(|&&x| x % 2 == 0).map(|&x| x * x).fold(0u64, |a, b| a.wrapping_add(b))
}
#[inline(never)]
fn generic_closure<F: Fn(u64) -> u64>(v: &[u64], f: F) -> u64 {
    v.iter().fold(0u64, |a, &x| a.wrapping_add(f(x)))
}
#[inline(never)]
fn dyn_closure(v: &[u64], f: &dyn Fn(u64) -> u64) -> u64 {
    v.iter().fold(0u64, |a, &x| a.wrapping_add(f(x)))
}

fn best<F: FnMut() -> u64>(mut f: F) -> (f64, u64) {
    let mut b = f64::MAX; let mut r = 0;
    for _ in 0..9 { let t = Instant::now(); r = black_box(f()); b = b.min(t.elapsed().as_secs_f64()); }
    (b, r)
}

fn main() {
    let n = 10_000_000usize;
    let mut x = 7u64; // xorshift: the same values on every run
    let v: Vec<u64> = (0..n).map(|_| { x ^= x << 13; x ^= x >> 7; x ^= x << 17; x % 1000 }).collect();
    let v = black_box(v);
    let sq = |x: u64| if x % 2 == 0 { x * x } else { 0 };
    let rows: [(&str, Box<dyn FnMut() -> u64>); 5] = [
        ("while loop with v[i]", Box::new(|| index_loop(&v))),
        ("for x in v", Box::new(|| for_loop(&v))),
        ("iter().filter().map().fold()", Box::new(|| chain(&v))),
        ("generic closure F: Fn", Box::new(|| generic_closure(&v, sq))),
        ("&dyn Fn closure", Box::new(|| dyn_closure(&v, black_box(&sq)))),
    ];
    for (name, mut f) in rows {
        let (t, r) = best(&mut f);
        println!("{:<29} {:>6.3} ns/element  result {}", name, t * 1e9 / n as f64, r);
    }
}
