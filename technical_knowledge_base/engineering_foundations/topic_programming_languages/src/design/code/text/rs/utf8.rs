fn main() {
    let s = String::from("héllo👍");
    println!("{} {}", s.len(), s.chars().count());   // 10 bytes, 6 chars
    println!("{:?}", s.chars().nth(1));                // walk to the 2nd char
    println!("{}", &s[0..2]);                          // byte range: 'h' + half of 'é'
}
