fn main() {
    let x = 5; // immutable by default
    let mut y = 5; // `mut` makes it changeable
    y += 1;
    let spaces = "   "; // shadowing: a new variable with the same name...
    let spaces = spaces.len(); // ...may even have a different type
    const MAX_TOKENS: u32 = 4_096; // a compile-time constant, type required
    println!("x={x} y={y} spaces={spaces} max={MAX_TOKENS}");
    let z; // declared now, assigned once later
    if y > 5 { z = "big" } else { z = "small" }
    println!("z={z}");
}
