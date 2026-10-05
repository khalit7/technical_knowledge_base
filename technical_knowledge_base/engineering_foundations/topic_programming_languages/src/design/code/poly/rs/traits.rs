trait Speak { fn speak(&self) -> String; }
struct Dog; struct Cat;
impl Speak for Dog { fn speak(&self) -> String { "woof".into() } }
impl Speak for Cat { fn speak(&self) -> String { "meow".into() } }
fn talk<T: Speak>(x: &T) { println!("{}", x.speak()); }  // generic: one copy per T
fn main() {
    talk(&Cat);
    let pets: Vec<Box<dyn Speak>> = vec![Box::new(Dog), Box::new(Cat)]; // dyn: chosen at run time
    for p in &pets { println!("{}", p.speak()); }
}
