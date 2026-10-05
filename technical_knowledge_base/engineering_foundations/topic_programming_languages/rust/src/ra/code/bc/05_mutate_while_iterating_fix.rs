fn main() {
    let mut queue = vec![1, 2, 3];
    let extra: Vec<i32> = queue.iter().filter(|&&x| x == 2).map(|_| 20).collect();
    queue.extend(extra); // read first, then write
    println!("{queue:?}");
}
