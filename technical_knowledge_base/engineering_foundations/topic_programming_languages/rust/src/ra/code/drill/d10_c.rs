fn main() {
    let mut users = vec![("cy".to_string(), 5), ("bob".to_string(), 9), ("ada".to_string(), 5)];
    users.sort_by_key(|u| (-u.1, &u.0));
    println!("{users:?}");
}
