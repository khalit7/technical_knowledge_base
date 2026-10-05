fn main() {
    let mut users = vec![("cy", 5), ("bob", 9), ("ada", 5)];
    users.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(b.0)));
    println!("{users:?}");
}
