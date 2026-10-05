fn main() {
    let v = vec![10u32, 20, 30];
    let p: *const u32 = v.as_ptr();
    println!("{}", *p.add(1));
}
