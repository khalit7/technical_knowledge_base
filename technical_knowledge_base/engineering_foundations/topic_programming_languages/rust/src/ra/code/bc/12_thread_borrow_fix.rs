use std::thread;

fn main() {
    let docs = vec!["a b", "c d e"];
    let h = thread::spawn(move || docs.len()); // the thread owns docs now
    println!("{}", h.join().unwrap());
    let docs2 = vec!["f"];
    let n = thread::scope(|s| s.spawn(|| docs2.len()).join().unwrap()); // or a scoped thread may borrow
    println!("{n} {docs2:?}");
}
