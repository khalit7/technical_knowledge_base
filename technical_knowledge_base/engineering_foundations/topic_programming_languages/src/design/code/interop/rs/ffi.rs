use std::ffi::{c_char, CString};
unsafe extern "C" {
    fn strlen(s: *const c_char) -> usize;      // a C function from the system libc
}
fn main() {
    let s = CString::new("héllo").unwrap();      // adds the trailing zero byte C expects
    println!("{}", unsafe { strlen(s.as_ptr()) });  // unsafe: Rust cannot check C code
}
