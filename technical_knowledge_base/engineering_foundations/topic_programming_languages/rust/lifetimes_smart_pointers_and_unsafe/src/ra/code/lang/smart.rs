use std::cell::{Cell, RefCell};
use std::rc::{Rc, Weak};

// Box: put a value on the heap. Needed for recursive types, whose size would otherwise be infinite.
#[derive(Debug)]
enum Expr {
    Num(f64),
    Add(Box<Expr>, Box<Expr>),
    Mul(Box<Expr>, Box<Expr>),
}

fn eval(e: &Expr) -> f64 {
    match e {
        Expr::Num(x) => *x,
        Expr::Add(a, b) => eval(a) + eval(b),
        Expr::Mul(a, b) => eval(a) * eval(b),
    }
}

#[derive(Debug)]
struct Doc {
    name: String,
    cache_hits: Cell<u32>, // interior mutability for a Copy value
}

fn main() {
    let e = Expr::Add(Box::new(Expr::Num(2.0)), Box::new(Expr::Mul(Box::new(Expr::Num(3.0)), Box::new(Expr::Num(4.0)))));
    println!("2 + 3 * 4 = {}", eval(&e));

    // Rc: shared ownership in one thread; the last owner to go frees the value
    let shared = Rc::new(Doc { name: "system prompt".into(), cache_hits: Cell::new(0) });
    let a = Rc::clone(&shared); // copies a pointer, bumps a counter
    {
        let b = Rc::clone(&shared);
        b.cache_hits.set(b.cache_hits.get() + 1); // mutate through a shared reference
        println!("strong_count inside = {}", Rc::strong_count(&shared));
    }
    println!("strong_count after = {}, hits = {}, name = {}", Rc::strong_count(&a), a.cache_hits.get(), a.name);

    // RefCell: borrow rules checked at run time instead of compile time
    let log = Rc::new(RefCell::new(Vec::<String>::new()));
    let writer = Rc::clone(&log);
    writer.borrow_mut().push("first".into());
    writer.borrow_mut().push("second".into());
    println!("log = {:?}", log.borrow());

    // Weak: a non-owning pointer (it does not keep the value alive); used to break cycles
    let parent = Rc::new(String::from("parent"));
    let w: Weak<String> = Rc::downgrade(&parent);
    println!("weak upgrade while alive: {}", w.upgrade().is_some());
    drop(parent);
    println!("weak upgrade after drop: {}", w.upgrade().is_some());
    println!("size_of Box<Expr> = {}, Rc<Doc> = {}, Expr = {}",
        std::mem::size_of::<Box<Expr>>(), std::mem::size_of::<Rc<Doc>>(), std::mem::size_of::<Expr>());

    // The run-time check, failing: two mutable borrows at once
    let first = log.borrow_mut();
    let second = log.borrow_mut(); // panics: already mutably borrowed
    println!("{} {}", first.len(), second.len());
}
