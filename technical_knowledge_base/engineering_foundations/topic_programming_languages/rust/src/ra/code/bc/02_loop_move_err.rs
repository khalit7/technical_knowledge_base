fn main() {
    let tag = String::from("batch");
    let mut out = Vec::new();
    for i in 0..3 {
        out.push((i, tag));
    }
    println!("{out:?}");
}
