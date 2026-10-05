fn main() {
    let names = vec![String::from("ada"), String::from("bob")];
    let first = &names[0]; // borrow it
    let copy = names[1].clone(); // or clone it
    println!("{first} {copy} {}", names.len());
    let mut names = names;
    let taken = names.remove(0); // or take it out of the Vec for good
    println!("took {taken}, left {names:?}");
}
