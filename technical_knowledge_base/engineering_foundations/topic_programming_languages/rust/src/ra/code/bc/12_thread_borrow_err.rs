use std::thread;

fn main() {
    let docs = vec!["a b", "c d e"];
    let h = thread::spawn(|| docs.len());
    println!("{}", h.join().unwrap());
}
