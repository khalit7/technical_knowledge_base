// flags: -O --crate-type lib --emit asm
// cmd: sed -n '/^_add:/,/ret/p' prog
#[unsafe(no_mangle)]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
