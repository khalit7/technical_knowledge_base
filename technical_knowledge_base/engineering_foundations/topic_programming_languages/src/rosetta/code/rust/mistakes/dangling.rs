fn main() {
    let mut top: Vec<(String, u64)> = vec![("u0029".into(), 9491), ("u0005".into(), 4816)];
    let first = &top[0]; // a reference INTO the vector's buffer
    for i in 0..1000 {
        top.push((format!("x{i}"), i)); // growing may reallocate the buffer
    }
    println!("{first:?} {}", top.len());
}
