fn main() {
    let a = vec![1, 2, 3];
    let b = a;            // ownership moves to b; a is no longer usable
    println!("{:?} {:?}", a, b);
}
