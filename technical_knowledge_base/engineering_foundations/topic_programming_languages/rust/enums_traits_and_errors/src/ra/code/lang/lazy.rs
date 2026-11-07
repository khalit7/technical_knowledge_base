// The chain from iters.rs, with a print in each closure: who runs, in what order.
// Lazy: collect pulls one word at a time through filter and map.
// Eager: the Python-list habit, a full Vec after each step.
// take(2): the consumer stops early, so the source is never read to the end.
fn main() {
    let words = ["Rust", "is", "fast", "and", "safe", "and", "fun"];
    let chain = words.iter()
        .filter(|w| { let keep = w.len() > 2; println!("  filter {w:<5} {}", if keep { "keep" } else { "drop" }); keep })
        .map(|w| { println!("  map    {w:<5} -> {}", w.to_lowercase()); w.to_lowercase() });
    println!("lazy: chain built, nothing printed yet");
    println!("lazy: the chain is one value of {} bytes, type {}", std::mem::size_of_val(&chain), std::any::type_name_of_val(&chain));
    let long: Vec<String> = chain.collect();
    println!("lazy: collect returned {long:?}");
    let kept: Vec<&&str> = words.iter()
        .filter(|w| { let keep = w.len() > 2; println!("  filter {w:<5} {}", if keep { "keep" } else { "drop" }); keep })
        .collect();
    println!("eager: first Vec, {} items {kept:?}", kept.len());
    let lower: Vec<String> = kept.iter()
        .map(|w| { println!("  map    {w:<5} -> {}", w.to_lowercase()); w.to_lowercase() })
        .collect();
    println!("eager: second Vec, {} items {lower:?}", lower.len());
    // Lazy again, but the consumer wants only two: the rest of the words are never looked at.
    let two: Vec<String> = words.iter()
        .filter(|w| { let keep = w.len() > 2; println!("  filter {w:<5} {}", if keep { "keep" } else { "drop" }); keep })
        .map(|w| { println!("  map    {w:<5} -> {}", w.to_lowercase()); w.to_lowercase() })
        .take(2)
        .collect();
    println!("take(2): collect returned {two:?}");
}
