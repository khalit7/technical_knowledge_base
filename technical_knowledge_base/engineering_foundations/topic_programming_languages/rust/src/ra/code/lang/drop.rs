struct Noisy(&'static str);

impl Drop for Noisy {
    fn drop(&mut self) {
        println!("drop {}", self.0);
    }
}

fn consume(n: Noisy) {
    println!("consume got {}", n.0);
} // n is dropped here, at the end of the function that owns it

fn main() {
    let _a = Noisy("a");
    let b = Noisy("b");
    {
        let _c = Noisy("c");
        println!("inner scope ends");
    } // c dropped here
    consume(b); // b moved into consume; dropped inside it
    let _d = Noisy("d");
    println!("main ends");
} // locals dropped in reverse order of declaration: d, then a
