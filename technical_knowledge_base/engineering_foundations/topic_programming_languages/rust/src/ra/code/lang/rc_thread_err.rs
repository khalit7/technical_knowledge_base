use std::rc::Rc;
use std::thread;

fn main() {
    let shared = Rc::new(vec![1, 2, 3]);
    let s2 = Rc::clone(&shared);
    let h = thread::spawn(move || s2.len());
    println!("{}", h.join().unwrap() + shared.len());
}
