use std::collections::HashMap;

fn main() {
    let mut per_user: HashMap<String, u64> = HashMap::new();
    per_user.insert("u0029".into(), 9491);
    let n = per_user.get("u0777") + 5; // get returns Option<&u64>, not u64
    println!("{n}");
}
