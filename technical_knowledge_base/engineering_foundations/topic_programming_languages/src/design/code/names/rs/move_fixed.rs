fn main() {
    let a = vec![1, 2, 3];
    let b = a.clone();    // an explicit copy
    let c = &a;           // or borrow: look without taking
    println!("{:?} {:?} {:?}", a, b, c);
}
