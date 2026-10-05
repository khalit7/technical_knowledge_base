// Compiles and runs, but clippy has opinions: each one teaches an idiom.
fn total(v: &Vec<u64>) -> u64 {
    let mut sum = 0;
    for i in 0..v.len() {
        sum = sum + v[i];
    }
    return sum;
}

fn main() {
    let v = vec![3, 4, 5];
    let empty = v.len() == 0;
    println!("total {} empty {}", total(&v), empty);
}
