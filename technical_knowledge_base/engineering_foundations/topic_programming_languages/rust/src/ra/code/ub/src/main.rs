// Undefined behaviour that compiles and "works": reading one element past the end
// through a raw pointer, and using a pointer after its Vec was freed.
fn main() {
    let v = vec![10u32, 20, 30];
    let p = v.as_ptr();
    let past_end = unsafe { *p.add(3) }; // out of bounds: UB
    println!("read past the end: {past_end}");
    let q = {
        let w = vec![1u32, 2, 3];
        w.as_ptr()
    }; // w freed here; q dangles
    let after_free = unsafe { *q }; // use after free: UB
    println!("read after free: {after_free}");
}
