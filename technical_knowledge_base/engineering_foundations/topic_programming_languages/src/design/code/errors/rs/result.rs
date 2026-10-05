// flags: -W unused_must_use
use std::num::ParseIntError;
fn double(s: &str) -> Result<i32, ParseIntError> {
    let n: i32 = s.parse()?;          // ? hands the error back to the caller
    Ok(n * 2)
}
fn main() {
    println!("{:?} {:?}", double("21"), double("4x2"));
    double("7");                      // ignoring a Result: the compiler warns
    let n: i32 = "4x2".parse().unwrap();   // unwrap: panic if Err
}
