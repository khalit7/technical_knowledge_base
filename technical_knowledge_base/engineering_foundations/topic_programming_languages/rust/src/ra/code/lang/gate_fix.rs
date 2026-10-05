fn main() {
    let mut v = vec![1];
    let first = v[0]; // copy the i32 out instead of borrowing it
    v.push(2);
    println!("{first} {:?}", v);
}
