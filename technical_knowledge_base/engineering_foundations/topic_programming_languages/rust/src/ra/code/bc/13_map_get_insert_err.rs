use std::collections::HashMap;

// Return the cached value, or insert one and return that.
fn get_or_insert(cache: &mut HashMap<u32, String>, k: u32) -> &String {
    if let Some(v) = cache.get(&k) {
        return v;
    }
    cache.insert(k, format!("value {k}"));
    cache.get(&k).unwrap()
}

fn main() {
    let mut cache = HashMap::new();
    println!("{}", get_or_insert(&mut cache, 7));
}
