fn main() {
    let top = vec!["u0029".to_string(), "u0005".to_string()];
    let mut saved = top;      // a MOVE: ownership passes to saved, top is no longer usable
    saved.push("u0042".to_string());
    println!("top: {:?}", top);
}
