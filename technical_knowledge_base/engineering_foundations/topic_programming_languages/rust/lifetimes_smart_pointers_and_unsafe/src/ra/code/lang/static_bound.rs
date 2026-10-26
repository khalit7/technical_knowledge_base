use std::fmt::Debug;

// T: 'static means "T holds no borrow that could expire", not "T lives forever".
fn keep<T: Debug + 'static>(t: T) -> Box<dyn Debug> {
    Box::new(t)
}

fn main() {
    let owned = String::from("an owned String is 'static");
    let b = keep(owned); // fine: a String borrows nothing
    println!("{b:?}");
    drop(b); // ... and it is freed right here, long before the program ends
    println!("dropped; a 'static bound never kept it alive");
}
