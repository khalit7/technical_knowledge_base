. ../tools_research/env.sh; . ./rec.sh
W=$PL/tools_walk/py; rm -rf $W; mkdir -p $W; cd $W; export UV_CACHE_DIR=$PL/tools_walk/uvcache_fresh; rm -rf $UV_CACHE_DIR
export TRANSCRIPT=$PL/tools_walk/py.txt; : > $TRANSCRIPT
rec "uv --version"
rec "uv init hello-tokens --python 3.14"
cd hello-tokens
echo "## files after uv init" >> $TRANSCRIPT; tree_list . >> $TRANSCRIPT; echo >> $TRANSCRIPT
echo "## pyproject.toml" >> $TRANSCRIPT; cat pyproject.toml >> $TRANSCRIPT; echo >> $TRANSCRIPT
echo "## src/hello_tokens/__init__.py as generated" >> $TRANSCRIPT; cat src/hello_tokens/__init__.py >> $TRANSCRIPT; echo "## .python-version" >> $TRANSCRIPT; cat .python-version >> $TRANSCRIPT; echo "## git?" >> $TRANSCRIPT; ls -d .git >> $TRANSCRIPT 2>&1; echo >> $TRANSCRIPT
rec "uv add --dev pytest ruff"
echo "## files after uv add" >> $TRANSCRIPT; tree_list . >> $TRANSCRIPT; echo >> $TRANSCRIPT
echo "## pyproject.toml after uv add" >> $TRANSCRIPT; cat pyproject.toml >> $TRANSCRIPT; echo >> $TRANSCRIPT
echo "## uv.lock head" >> $TRANSCRIPT; head -12 uv.lock >> $TRANSCRIPT; echo "($(wc -l < uv.lock) lines)" >> $TRANSCRIPT; echo >> $TRANSCRIPT
cat > src/hello_tokens/__init__.py <<'PY'
import re


def count_tokens(text: str) -> int:
    """Count runs of ASCII letters or digits."""
    return len(re.findall(r"[A-Za-z0-9]+", text))


def main() -> None:
    print(count_tokens("Hello from hello-tokens, x86_64 café!"))


if __name__ == "__main__":
    main()
PY
mkdir -p tests; cat > tests/test_tokens.py <<'PY'
from hello_tokens import count_tokens


def test_count_tokens():
    assert count_tokens("x86_64 café") == 3
PY
echo "## edited src/hello_tokens/__init__.py and new tests/test_tokens.py (written by hand)" >> $TRANSCRIPT
rec "uv run hello-tokens"
rec "uv run ruff check && uv run ruff format --check"
rec "uv run pytest -q"
