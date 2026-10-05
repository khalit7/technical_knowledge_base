use std::collections::HashMap;
fn main() {
    let per_user: HashMap<&str, u64> = HashMap::from([("u0029", 9491)]);
    let n = per_user.get("nobody");     // Option<&u64>: Some(&value) or None
    println!("{:?}", n);
    println!("{}", n.copied().unwrap_or(0) + 1);   // you must say what None means
    let total: u64 = n + 1;             // not allowed: an Option is not a number
}
