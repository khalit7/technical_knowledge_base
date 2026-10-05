. ../tools_research/env.sh; . ./rec.sh
export TRANSCRIPT=$PL/tools_walk/extra.txt; : > $TRANSCRIPT
# Bun
W=$PL/tools_walk/bun; rm -rf $W; mkdir -p $W/hello-bun; cd $W/hello-bun
rec "bun --version"
rec "bun init -y"
echo "## files after bun init" >> $TRANSCRIPT; tree_list . >> $TRANSCRIPT; echo >> $TRANSCRIPT
rec "bun run index.ts"
cat > tokens.test.ts <<'TS'
import { expect, test } from "bun:test";
test("counts ASCII runs", () => {
  expect("x86_64 café".match(/[A-Za-z0-9]+/g)?.length).toBe(3);
});
TS
rec "bun test 2>&1"
# Python type checkers on one bug
W=$PL/tools_walk/tycheck; rm -rf $W; mkdir -p $W; cd $W
cat > oops.py <<'PY'
import re


def count_tokens(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9]+", text))


n: int = count_tokens(42)
PY
rec "uv run --no-project --python 3.14 python oops.py 2>&1 | tail -3"
rec "uvx ty@0.0.84 check oops.py 2>&1"
rec "uvx mypy@2.4.0 oops.py 2>&1"
rec "uvx --from pyright@1.1.414 pyright oops.py 2>&1 | tail -4"
