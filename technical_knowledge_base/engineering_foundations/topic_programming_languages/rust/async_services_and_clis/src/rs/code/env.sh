# Source me: toolchains live in the session scratchpad (see ../versions.txt)
P=${PL:-${TMPDIR:-/tmp}/pl}
export RUSTUP_HOME=$P/rust/rustup CARGO_HOME=$P/rust/cargo CARGO_TARGET_DIR=$P/rs/target
export PATH=$P/rust/cargo/bin:$P/bin:$P/rs/oha/bin:$PATH
