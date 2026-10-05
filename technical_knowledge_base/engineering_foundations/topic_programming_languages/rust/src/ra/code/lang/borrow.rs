fn total(v: &[u64]) -> u64 {
    // borrows: reads, does not own
    v.iter().sum()
}

fn add_one(v: &mut Vec<u64>) {
    // borrows exclusively: may change it
    v.push(1);
}

fn main() {
    let mut v = vec![3, 4, 5];
    let a = &v; // any number of shared borrows at once
    let b = &v;
    println!("{} {}", total(a), total(b));
    add_one(&mut v); // a and b are no longer used, so this is allowed
    println!("{:?} total {}", v, total(&v));
}
