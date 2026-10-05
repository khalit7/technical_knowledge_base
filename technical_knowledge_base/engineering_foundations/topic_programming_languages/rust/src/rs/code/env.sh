# Source me: toolchains live in the session scratchpad (see ../versions.txt)
P=${PL:-/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/pl}
export RUSTUP_HOME=$P/rust/rustup CARGO_HOME=$P/rust/cargo CARGO_TARGET_DIR=$P/rs/target
export PATH=$P/rust/cargo/bin:$P/bin:$P/rs/oha/bin:$PATH
