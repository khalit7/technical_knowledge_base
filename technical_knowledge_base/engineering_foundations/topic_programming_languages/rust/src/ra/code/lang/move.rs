fn shout(s: String) -> String {
    // takes ownership of s; returns ownership of a new String
    s.to_uppercase()
}

fn main() {
    let a = String::from("hello");
    let b = a; // move: b now owns the heap buffer
    println!("b = {b}");
    let c = b.clone(); // explicit deep copy: a second heap buffer
    let d = shout(b); // b moves into the function
    println!("c = {c}, d = {d}");
    let n = 5; // i32 is Copy: assignment copies the bits
    let m = n;
    println!("n = {n}, m = {m}"); // both still usable
}
