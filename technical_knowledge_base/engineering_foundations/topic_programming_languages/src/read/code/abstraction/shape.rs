trait HasTokens { fn tokens(&self) -> usize; }    // nominal: a type fits only if it says `impl HasTokens`

struct Message(String);
impl HasTokens for Message { fn tokens(&self) -> usize { self.0.split_whitespace().count() } }

// Generic: one copy of `total` is compiled per concrete T (monomorphisation), calls are direct.
fn total<T: HasTokens>(items: &[T]) -> usize { items.iter().map(|x| x.tokens()).sum() }
// Dynamic: one compiled copy, each call goes through a table of function pointers (a vtable).
fn total_dyn(items: &[Box<dyn HasTokens>]) -> usize { items.iter().map(|x| x.tokens()).sum() }

fn main() {
    let msgs = vec![Message("hello there".into()), Message("a b c".into())];
    println!("{}", total(&msgs));
    let mixed: Vec<Box<dyn HasTokens>> = vec![Box::new(Message("d".into()))];
    println!("{}", total_dyn(&mixed));
    println!("{}", total(&[42u32]));
}
