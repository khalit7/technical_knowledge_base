fn count_words(text: &str) -> usize {
    // &str accepts a String (via &s) and a literal alike
    text.split_whitespace().count()
}

fn main() {
    let s = String::from("café 日本語 🦀");
    println!("len() = {} bytes", s.len());
    println!("chars = {}", s.chars().count());
    println!("bytes of 'é': {:?}", "é".as_bytes());
    println!("&s[0..3] = {:?}", &s[0..3]); // byte offsets
    println!("first char = {:?}", s.chars().next());
    println!("char_indices: {:?}", s.char_indices().map(|(i, _)| i).collect::<Vec<_>>());
    let mut owned = String::new(); // String: owned, growable, on the heap
    owned.push_str("tokens");
    owned += " and logits";
    let view: &str = &owned[0..6]; // &str: a borrowed view (pointer + length)
    println!("{owned} | {view} | words {}", count_words(&owned) + count_words("a literal is a &str"));
    println!("size_of String = {}, &str = {}", std::mem::size_of::<String>(), std::mem::size_of::<&str>());
    println!("upper: {}", s.to_uppercase());
    println!("reversed chars: {}", s.chars().rev().collect::<String>());
    let cut = &s[0..4]; // 'é' occupies bytes 3 and 4: this panics at run time
    println!("{cut}");
}
