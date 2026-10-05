fn main() {
    let mut v = vec![1];
    let first = &v[0];
    println!("{first}"); // last use of the borrow
    v.push(2); // fine: the shared borrow has already ended
    println!("{:?}", v);
}
