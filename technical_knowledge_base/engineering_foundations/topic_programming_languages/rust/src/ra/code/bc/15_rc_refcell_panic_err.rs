use std::cell::RefCell;

fn main() {
    let history = RefCell::new(vec![String::from("hi")]);
    for msg in history.borrow().iter() {
        if msg == "hi" {
            history.borrow_mut().push(String::from("hello")); // compiles; fails at run time
        }
    }
    println!("{:?}", history.borrow());
}
