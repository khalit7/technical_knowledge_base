fn main() {
    let v = vec![10u32, 20, 30];
    let p: *const u32 = v.as_ptr(); // making a raw pointer is safe
    let second = unsafe { *p.add(1) }; // dereferencing it is not: we promise it is in bounds
    println!("second = {second}");
    // A safe API built on unsafe: split_at_mut hands out two &mut halves of one slice,
    // which the borrow checker cannot prove disjoint by itself.
    let mut a = [1, 2, 3, 4];
    let (l, r) = a.split_at_mut(2);
    l[0] += 100;
    r[0] += 100;
    println!("{a:?}");
}
