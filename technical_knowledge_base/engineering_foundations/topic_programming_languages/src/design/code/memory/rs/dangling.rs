fn main() {
    let r;
    {
        let s = String::from("hi");
        r = &s;           // borrow s
    }                     // s is freed here
    println!("{r}");      // would read freed memory
}
