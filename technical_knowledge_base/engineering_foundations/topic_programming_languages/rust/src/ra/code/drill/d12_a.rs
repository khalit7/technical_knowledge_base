fn main() {
    let base: u64 = std::env::args().count() as u64 + 1; // 2, read at run time
    println!("{}", base.pow(64));
}
