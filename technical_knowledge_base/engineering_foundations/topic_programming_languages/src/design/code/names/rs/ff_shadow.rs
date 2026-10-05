fn main() {
    let x = 1;
    {
        let x = 2;            // a new x that shadows the outer one in this block
        println!("inner {x}");
    }
    let x = "now a string";   // shadowing may even change the type
    println!("outer {x}");
}
