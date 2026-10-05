use std::fmt::Display;

// A trait: a named set of methods a type promises to have (like a Protocol).
trait Tokenizer {
    fn name(&self) -> String;
    fn count(&self, text: &str) -> usize;
    // a default method, written once in terms of the others
    fn report(&self, text: &str) -> String {
        format!("{} -> {} tokens", self.name(), self.count(text))
    }
}

struct Whitespace;
struct Chars { per_token: usize }

impl Tokenizer for Whitespace {
    fn name(&self) -> String { "whitespace".into() }
    fn count(&self, text: &str) -> usize { text.split_whitespace().count() }
}

impl Tokenizer for Chars {
    fn name(&self) -> String { format!("chars/{}", self.per_token) }
    fn count(&self, text: &str) -> usize { text.chars().count().div_ceil(self.per_token) }
}

// Generic: one copy of this function is compiled per concrete T (monomorphisation).
fn total<T: Tokenizer>(t: &T, docs: &[&str]) -> usize {
    docs.iter().map(|d| t.count(d)).sum()
}

// Trait object: one compiled copy; the call goes through a table of function pointers.
fn total_dyn(t: &dyn Tokenizer, docs: &[&str]) -> usize {
    docs.iter().map(|d| t.count(d)).sum()
}

// impl Trait in argument position is shorthand for a generic
fn show_all(items: &[impl Display]) -> String {
    items.iter().map(|x| x.to_string()).collect::<Vec<_>>().join(", ")
}

fn main() {
    let docs = ["the cat sat", "on the mat today"];
    println!("{}", Whitespace.report(docs[0]));
    println!("{}", Chars { per_token: 4 }.report(docs[0]));
    println!("generic: {} {}", total(&Whitespace, &docs), total(&Chars { per_token: 4 }, &docs));
    let toks: Vec<Box<dyn Tokenizer>> = vec![Box::new(Whitespace), Box::new(Chars { per_token: 3 })];
    for t in &toks {
        println!("dyn: {} = {}", t.name(), total_dyn(t.as_ref(), &docs));
    }
    println!("{}", show_all(&[1.5, 2.25]));
    println!("size_of &Whitespace = {}, &dyn Tokenizer = {}",
        std::mem::size_of::<&Whitespace>(), std::mem::size_of::<&dyn Tokenizer>());
}
