fn main() {
    let v = vec![1, 2, 3];
    let i = std::env::args().count() + 2;            // 3, known only at run time
    println!("{:?}", v.get(i));                      // checked, returns Option: None
    println!("{}", unsafe { *v.get_unchecked(1) });  // unsafe: you promise i is in range
    println!("{}", v[i]);                            // checked: panics
}
