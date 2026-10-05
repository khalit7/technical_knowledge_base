fn main() {
    let d = vec![("b", 1), ("a", 2), ("c", 3), ("e", 4), ("d", 5), ("f", 6)];
    println!("{:?}", d.iter().map(|(k, _)| k).collect::<Vec<_>>());
}
