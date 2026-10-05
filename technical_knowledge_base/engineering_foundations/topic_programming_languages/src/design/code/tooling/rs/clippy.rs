// cmd: clippy-driver --edition 2024 -A unused --color never clippy.rs -o prog2 2>&1 | grep -E '^(warning|error)|-->|help'
fn total(xs: &Vec<i32>) -> i32 {
    let mut t = 0;
    for i in 0..xs.len() { t += xs[i]; }
    t
}
fn main() { println!("{}", total(&vec![1, 2, 3])); }
