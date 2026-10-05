// Keep a reference to the first user's name, then keep adding users.
fn main() {
    let mut users: Vec<String> = Vec::new();
    users.push("u0029-the-heaviest-user".to_string());
    let first = &users[0]; // a borrow of the vector's contents
    for i in 0..100 {
        users.push(format!("u{i}-another-user-name")); // needs to change the vector
    }
    println!("first user: {first}");
}
