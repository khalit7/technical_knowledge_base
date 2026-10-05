fn main() {
    let mut queue = vec![1, 2, 3];
    for x in &queue {
        if *x == 2 {
            queue.push(20);
        }
    }
    println!("{queue:?}");
}
