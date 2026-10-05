. ../tools_research/env.sh; . ./rec.sh
W=$PL/tools_walk/miri; rm -rf $W; mkdir -p $W; cd $W
export TRANSCRIPT=$PL/tools_walk/miri.txt; : > $TRANSCRIPT
cargo new --quiet uaf >/dev/null 2>&1; cd uaf
cat > src/main.rs <<'RS'
fn main() {
    let mut v = vec![1, 2, 3];
    let first: *const i32 = &v[0]; // a raw pointer: the borrow checker does not track it
    v.push(4); // may reallocate: the old buffer is freed
    println!("{}", unsafe { *first }); // use after free, allowed only inside unsafe
}
RS
rec "cargo +nightly miri --version"
rec "cargo run -q"
rec "cargo +nightly miri run -q 2>&1 | head -16"
cat > src/main.rs <<'RS'
fn main() {
    let mut v = vec![1, 2, 3];
    let first = &v[0];
    v.push(4);
    println!("{first}");
}
RS
rec "cargo build -q 2>&1 | head -14"
