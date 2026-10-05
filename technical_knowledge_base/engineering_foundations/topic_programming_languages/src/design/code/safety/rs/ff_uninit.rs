fn f(flag: bool) -> i32 {
    let total: i32;
    if flag { total = 1; }
    total
}
fn main() { println!("{}", f(false)); }
