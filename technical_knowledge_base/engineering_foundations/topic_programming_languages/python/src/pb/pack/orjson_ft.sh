#!/bin/bash
# orjson 3.12.0 has no cp314t wheel: try to build it for free-threaded 3.14 and keep the log.
HERE=$(cd "$(dirname "$0")" && pwd); . $HERE/../env.sh
export RUSTUP_HOME=$PL/rust/rustup CARGO_HOME=$PL/rust/cargo PATH=$PL/rust/cargo/bin:$PATH
cd $WORK; uv cache clean -q orjson 2>/dev/null || true
uv run --no-project --python $PY314T --with orjson==3.12.0 python -c "import orjson" > $WORK/orjson.log 2>&1; echo "[exit $?]" >> $WORK/orjson.log
sed -e "s#$PL#~/pl#g" $WORK/orjson.log > $HERE/../out/orjson_ft.txt
grep -E "Failed to build|does not support" $HERE/../out/orjson_ft.txt
