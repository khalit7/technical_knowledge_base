#[derive(Debug, Clone, PartialEq)]          // code generated at compile time
struct Point { x: i32, y: i32 }
macro_rules! square { ($e:expr) => { $e * $e }; }   // works on syntax trees, not text
fn main() {
    let p = Point { x: 1, y: 2 };
    println!("{:?} {}", p.clone(), p == Point { x: 1, y: 2 });
    println!("{}", square!(1 + 2));         // 9, not 1 + 2 * 1 + 2 = 5 as a C macro gives
}
