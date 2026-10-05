use std::collections::HashMap;
fn main() {
    let d = HashMap::from([("b", 1), ("a", 2), ("c", 3), ("e", 4), ("d", 5), ("f", 6)]);
    println!("{:?}", d.keys().collect::<Vec<_>>());
}
