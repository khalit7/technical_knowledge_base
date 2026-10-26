use std::cell::{Cell, RefCell};
use std::sync::atomic::AtomicU64;
use std::sync::{Arc, Mutex, MutexGuard, RwLock};

fn send<T: Send>() {}
fn sync<T: Sync>() {}

// Every "yes" cell of the page's Send and Sync table, checked by the compiler.
// The "no" cells are in sendsync_err.rs, each refused with its own error.
fn main() {
    send::<i32>(); sync::<i32>();
    send::<String>(); sync::<String>();
    send::<Vec<u8>>(); sync::<Vec<u8>>();
    send::<Box<i32>>(); sync::<Box<i32>>();
    send::<&i32>(); sync::<&i32>();
    send::<Arc<i32>>(); sync::<Arc<i32>>();
    send::<Cell<i32>>();
    send::<RefCell<i32>>();
    send::<Mutex<i32>>(); sync::<Mutex<i32>>();
    send::<Mutex<Cell<i32>>>(); sync::<Mutex<Cell<i32>>>();
    send::<Arc<Mutex<Vec<u8>>>>(); sync::<Arc<Mutex<Vec<u8>>>>();
    send::<RwLock<i32>>(); sync::<RwLock<i32>>();
    send::<AtomicU64>(); sync::<AtomicU64>();
    sync::<MutexGuard<'static, i32>>();
    println!("all 25 \"yes\" claims compile");
}
