use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Node {
    name: &'static str,
    next: RefCell<Option<Rc<Node>>>, // owning edge
    back: RefCell<Weak<Node>>,       // non-owning edge
}

impl Drop for Node {
    fn drop(&mut self) {
        println!("drop {}", self.name);
    }
}

fn node(name: &'static str) -> Rc<Node> {
    Rc::new(Node { name, next: RefCell::new(None), back: RefCell::new(Weak::new()) })
}

fn main() {
    {
        let x = node("x (cycle of Rc)");
        let y = node("y (cycle of Rc)");
        *x.next.borrow_mut() = Some(Rc::clone(&y)); // x -> y
        *y.next.borrow_mut() = Some(Rc::clone(&x)); // y -> x: a cycle
        println!("cycle: x strong_count = {}", Rc::strong_count(&x));
    } // our two handles go, but each node still owns the other: neither count reaches 0
    {
        let x = node("x (Weak back edge)");
        let y = node("y (Weak back edge)");
        *x.next.borrow_mut() = Some(Rc::clone(&y)); // x owns y
        *y.back.borrow_mut() = Rc::downgrade(&x); // y only points back at x
        println!("weak: x strong_count = {}, weak_count = {}", Rc::strong_count(&x), Rc::weak_count(&x));
        println!("y.back.upgrade() is {}", y.back.borrow().upgrade().map(|n| n.name).unwrap_or("gone"));
    }
    println!("end of main: the Rc cycle was never dropped (a leak, which safe Rust allows)");
}
