// Read a small file into memory: the Rust way (std, no runtime beyond libc).
fn main() {
    let s = std::fs::read_to_string("/work/hello.txt").unwrap(); // File::open -> open(2), read_to_end -> read(2)
    println!("{}", s.len());
}
