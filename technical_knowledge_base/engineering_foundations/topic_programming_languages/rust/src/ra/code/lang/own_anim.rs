// Prints the real addresses behind the ownership animation: a Vec is three
// machine words on the stack (pointer, capacity, length) and a buffer on the heap.
fn show(step: &str, name: &str, v: &Vec<u32>) {
    println!(
        "{step} {name} stack={:p} heap={:p} len={} cap={} data={:?}",
        v as *const Vec<u32>, v.as_ptr(), v.len(), v.capacity(), v
    );
}

fn main() {
    println!("size_of::<Vec<u32>>() = {}", std::mem::size_of::<Vec<u32>>());
    let mut v: Vec<u32> = Vec::with_capacity(3);
    v.extend([10, 20, 30]);
    show("1", "v", &v);
    let r = &v; // a shared borrow: a pointer to v's stack slot
    println!("2 r points to {:p} (v's stack slot), r.len()={}", r as *const Vec<u32>, r.len());
    v.push(40); // r is no longer used, so v may be mutated: the buffer is full, so it grows
    show("3", "v", &v);
    let m = &mut v; // one exclusive borrow
    m[0] = 11;
    println!("4 m points to {:p}, wrote m[0]=11", m as *const Vec<u32>);
    let w = v; // move: the three words are copied to w's slot, the heap buffer is not touched
    show("5", "w", &w);
    let c = w.clone(); // clone: a new heap buffer with a copy of the elements
    show("6", "c", &c);
    drop(w); // w's buffer is freed now
    println!("7 dropped w");
    show("8", "c", &c);
}
