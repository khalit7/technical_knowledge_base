use std::cell::RefCell;

fn main() {
    let history = RefCell::new(vec![String::from("hi")]);
    let greet = history.borrow().iter().any(|m| m == "hi"); // the shared borrow ends here
    if greet {
        history.borrow_mut().push(String::from("hello"));
    }
    println!("{:?}", history.borrow());
}
