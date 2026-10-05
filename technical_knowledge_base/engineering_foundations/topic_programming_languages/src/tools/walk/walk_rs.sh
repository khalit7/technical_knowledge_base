. ../tools_research/env.sh; . ./rec.sh
W=$PL/tools_walk/rs; rm -rf $W; mkdir -p $W; cd $W
export TRANSCRIPT=$PL/tools_walk/rs.txt; : > $TRANSCRIPT
rec "rustup --version 2>/dev/null; rustc --version; cargo --version"
rec "cargo new hello_tokens"
cd hello_tokens
echo "## files after cargo new" >> $TRANSCRIPT; tree_list . >> $TRANSCRIPT; echo >> $TRANSCRIPT
echo "## Cargo.toml" >> $TRANSCRIPT; cat Cargo.toml >> $TRANSCRIPT; echo >> $TRANSCRIPT
echo "## src/main.rs as generated" >> $TRANSCRIPT; cat src/main.rs >> $TRANSCRIPT; echo >> $TRANSCRIPT
cat > src/main.rs <<'RS'
/// Count runs of ASCII letters or digits.
fn count_tokens(text: &str) -> usize {
    let mut n = 0;
    let mut in_token = false;
    for b in text.bytes() {
        let a = b.is_ascii_alphanumeric();
        if a && !in_token {
            n += 1;
        }
        in_token = a;
    }
    n
}

fn main() {
    println!("{}", count_tokens("Hello from hello-tokens, x86_64 café!"));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_ascii_runs() {
        assert_eq!(count_tokens("x86_64 café"), 3);
    }
}
RS
echo "## edited src/main.rs (written by hand; the test lives in the same file)" >> $TRANSCRIPT
rec "cargo run"
rec "cargo test"
rec "cargo clippy && cargo fmt --check"
rec "cargo build --release && ls -la target/release/hello_tokens | awk '{print \$5, \$9}'"
echo "## files after builds" >> $TRANSCRIPT; tree_list . >> $TRANSCRIPT; ls target >> $TRANSCRIPT; echo >> $TRANSCRIPT
