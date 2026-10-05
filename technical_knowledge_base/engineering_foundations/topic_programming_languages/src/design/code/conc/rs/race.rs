fn main() {
    let mut n = 0;
    std::thread::scope(|s| {
        s.spawn(|| for _ in 0..1_000_000 { n += 1 });
        s.spawn(|| for _ in 0..1_000_000 { n += 1 });   // second mutable borrow
    });
}
