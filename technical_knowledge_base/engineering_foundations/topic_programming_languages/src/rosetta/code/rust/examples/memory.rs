// Task: where do 8 timestamps live in memory?
fn main() {
    let ts: Vec<i64> = (0..8).map(|i| 1759650000 + 7 * i).collect();
    println!(
        "Vec object at {:p}, buffer at {:p}, {} bytes per element",
        &ts,
        ts.as_ptr(),
        std::mem::size_of::<i64>()
    );
    for (i, x) in ts.iter().enumerate() {
        println!("ts[{i}] at {:p}  value {x}", x);
    }
}
