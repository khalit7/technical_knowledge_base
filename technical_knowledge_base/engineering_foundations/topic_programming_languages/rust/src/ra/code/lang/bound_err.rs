fn largest<T>(items: &[T]) -> &T {
    let mut best = &items[0];
    for x in items {
        if x > best {
            best = x;
        }
    }
    best
}

fn main() {
    println!("{}", largest(&[3, 9, 4]));
}
