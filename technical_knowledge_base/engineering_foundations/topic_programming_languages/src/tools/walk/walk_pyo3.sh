. ../tools_research/env.sh; . ./rec.sh
W=$PL/tools_walk/pyo3; rm -rf $W; mkdir -p $W; cd $W
export TRANSCRIPT=$PL/tools_walk/pyo3.txt; : > $TRANSCRIPT
rec "uvx maturin@1.15.0 new --bindings pyo3 tokrs"
cd tokrs
echo "## files after maturin new" >> $TRANSCRIPT; tree_list . >> $TRANSCRIPT; echo >> $TRANSCRIPT
echo "## Cargo.toml" >> $TRANSCRIPT; cat Cargo.toml >> $TRANSCRIPT; echo >> $TRANSCRIPT
echo "## src/lib.rs as generated" >> $TRANSCRIPT; cat src/lib.rs >> $TRANSCRIPT; echo >> $TRANSCRIPT
cat > src/lib.rs <<'RS'
use pyo3::prelude::*;

/// Count runs of ASCII letters or digits.
#[pyfunction]
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

#[pymodule]
mod tokrs {
    #[pymodule_export]
    use super::count_tokens;
}
RS
echo "## src/lib.rs edited by hand" >> $TRANSCRIPT
rec "uv venv -q --python 3.14 && uvx maturin@1.15.0 develop --uv --release 2>&1 | tail -4"
rec "uv run --no-project python -c 'import tokrs; print(tokrs.count_tokens(\"Hello from hello-tokens, x86_64 café!\"))'"
