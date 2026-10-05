// Task: closures. A tally that remembers state, and loop capture.
use std::collections::HashMap;

fn make_tally() -> impl FnMut(&str, u64) -> u64 {
    let mut counts: HashMap<String, u64> = HashMap::new();
    // `move`: the closure takes ownership of `counts`, so it can outlive this function.
    move |user, n| {
        let c = counts.entry(user.to_string()).or_insert(0);
        *c += n;
        *c
    }
}

fn main() {
    let mut add = make_tally();
    add("u0029", 5);
    let x = add("u0029", 7);
    let y = add("u0005", 3);
    println!("{x} {y}");

    let fns: Vec<Box<dyn Fn() -> i32>> = (0..3).map(|i| Box::new(move || i) as Box<dyn Fn() -> i32>).collect();
    println!("{:?}", fns.iter().map(|f| f()).collect::<Vec<_>>());
}
