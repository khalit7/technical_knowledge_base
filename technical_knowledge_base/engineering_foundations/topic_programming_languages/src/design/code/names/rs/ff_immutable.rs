fn main() {
    let limits = vec![100];    // without mut, the whole value is frozen
    limits.push(200);
}
