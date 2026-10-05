# Section 1 to 3: cargo, variables, numbers. rustc 1.99.0, cargo 1.99.0, edition 2024.
rec c_new . 'cargo new hello && cd hello && find . -not -path "./.git/*" -not -name .git | sort && cat Cargo.toml && cat src/main.rs'
rec c_run hello 'cargo run'
rec c_run2 hello 'cargo run --release'
rec c_clippy clip 'cargo clippy'
rec c_fmt clip 'cargo fmt --check'
run l_vars lang vars
fail l_vars_err lang vars_err
rec l_overflow_debug lang 'rustc --edition 2024 overflow.rs && ./overflow 254 && ./overflow 255'
rec l_overflow_release lang 'rustc --edition 2024 -O overflow.rs && ./overflow 255'
fail l_overflow_const lang overflow_const
run l_numbers lang numbers
rec l_numbers_py lang 'python3.14 numbers.py'
fail l_mix_err lang mix_err
