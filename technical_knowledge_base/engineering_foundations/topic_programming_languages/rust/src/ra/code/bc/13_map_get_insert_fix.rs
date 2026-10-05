use std::collections::HashMap;

// The entry API looks the key up once and hands back a reference either way.
fn get_or_insert(cache: &mut HashMap<u32, String>, k: u32) -> &String {
    cache.entry(k).or_insert_with(|| format!("value {k}"))
}

fn main() {
    let mut cache = HashMap::new();
    println!("{}", get_or_insert(&mut cache, 7));
    println!("{}", get_or_insert(&mut cache, 7));
}
