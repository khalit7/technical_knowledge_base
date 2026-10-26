use std::fmt::Debug;

fn keep<T: Debug + 'static>(t: T) -> Box<dyn Debug> {
    Box::new(t)
}

fn main() {
    let local = String::from("local");
    let b = keep(&local); // a borrow of a local is not 'static
    println!("{b:?}");
}
