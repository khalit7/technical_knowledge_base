use std::collections::BTreeMap;
fn main() {
    let d = BTreeMap::from([("b", 1), ("a", 2), ("c", 3), ("e", 4), ("d", 5), ("f", 6)]);
    println!("{:?}", d.keys().collect::<Vec<_>>());
}
