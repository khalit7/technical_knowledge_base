fn main() {
    let words = ["Rust", "is", "fast", "and", "safe", "and", "fun"];
    // An iterator chain: lazy until something consumes it (collect, sum, for).
    let long: Vec<String> = words.iter()
        .filter(|w| w.len() > 2)
        .map(|w| w.to_lowercase())
        .collect();
    println!("{long:?}");
    // Laziness, visible: nothing is printed until next() is called.
    let mut it = (1..=3).map(|x| { println!("  computing {x}"); x * 10 });
    println!("built the iterator");
    println!("first = {:?}", it.next());
    // Python's enumerate, zip, sum, any, max_by_key all exist
    for (i, w) in words.iter().enumerate().skip(5) { println!("{i} {w}"); }
    let lens: usize = words.iter().map(|w| w.len()).sum();
    let pairs: Vec<(char, usize)> = "abc".chars().zip(1..).collect();
    println!("lens {lens}, pairs {pairs:?}, any 'fun' {}", words.contains(&"fun"));
    println!("longest {:?}", words.iter().max_by_key(|w| w.len()));
    let (even, odd): (Vec<u32>, Vec<u32>) = (1..=6).partition(|n| n % 2 == 0);
    println!("even {even:?} odd {odd:?}");
    // Closures capture their environment: by reference, by mutable reference, or by value
    let limit = 4;
    let short = |w: &str| w.len() < limit; // borrows limit (Fn)
    let mut seen = 0;
    let mut count = |_w: &str| seen += 1; // mutably borrows seen (FnMut)
    for w in words { count(w); }
    let name = String::from("owner");
    let consume = move || name.len(); // moves name into the closure
    println!("short {}, seen {seen}, consume() {}", words.iter().filter(|w| short(w)).count(), consume());
    // A generator-like iterator: implement next()
    struct Countdown(u32);
    impl Iterator for Countdown {
        type Item = u32;
        fn next(&mut self) -> Option<u32> {
            if self.0 == 0 { None } else { self.0 -= 1; Some(self.0 + 1) }
        }
    }
    println!("{:?}", Countdown(3).collect::<Vec<_>>());
}
