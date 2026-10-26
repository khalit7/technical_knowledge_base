use std::cell::{Cell, RefCell};
use std::rc::Rc;
use std::sync::{Arc, MutexGuard};

fn send<T: Send>() {}
fn sync<T: Sync>() {}

// Every "no" cell of the page's Send and Sync table: each line is refused with its own E0277.
fn main() {
    send::<Rc<i32>>();
    sync::<Rc<i32>>();
    sync::<Cell<i32>>();
    sync::<RefCell<i32>>();
    send::<Arc<RefCell<i32>>>();
    sync::<Arc<RefCell<i32>>>();
    send::<MutexGuard<'static, i32>>();
    send::<*const i32>();
    sync::<*const i32>();
}
