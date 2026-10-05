fn main() {
    let fs: Vec<Box<dyn Fn() -> i32>> = (0..3).map(|i| Box::new(move || i) as Box<dyn Fn() -> i32>).collect();
    println!("{:?}", fs.iter().map(|f| f()).collect::<Vec<_>>());  // move: each copies its i
}
