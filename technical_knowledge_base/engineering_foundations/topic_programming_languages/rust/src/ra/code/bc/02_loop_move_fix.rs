fn main() {
    let tag = String::from("batch");
    let mut out = Vec::new();
    for i in 0..3 {
        out.push((i, tag.clone())); // each element needs its own String
    }
    println!("{out:?}");
}
