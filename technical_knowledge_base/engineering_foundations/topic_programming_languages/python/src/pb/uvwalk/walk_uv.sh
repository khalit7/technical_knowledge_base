#!/bin/bash
# uv beyond the first five commands (the root's Toolchain atlas shows init/add/run/ruff/pytest). Real runs, 2026-10-05.
HERE=$(cd "$(dirname "$0")" && pwd); . $HERE/../env.sh; . $HERE/rec.sh
D=$WORK/demo; rm -rf $D; mkdir -p $D; cd $D
export TRANSCRIPT=$WORK/uv_raw.txt; : > $TRANSCRIPT
printf "[user]\n\tname = you\n\temail = you@example.com\n" > $WORK/gitconfig; export GIT_CONFIG_GLOBAL=$WORK/gitconfig
rec "uv --version"
note "S1 interpreters"
rec "uv python list --only-installed --managed-python"
rec "uv python find 3.14t"
rec "uv run --no-project --python 3.15 python -c 'import sys; print(sys.version)'"
note "S2 three init flavours"
rec "uv init flat-demo --app --no-package --python 3.14 -q && find flat-demo -type f -not -path '*/.git/*' | sort && cat flat-demo/main.py"
rec "uv init --app app-demo --python 3.14 --no-pin-python -q && find app-demo -type f -not -path '*/.git/*' | sort && cat app-demo/pyproject.toml"
rec "uv init --lib lib-demo --python 3.14 -q && find lib-demo -type f -not -path '*/.git/*' | sort && sed -n '/build-system/,\$p' lib-demo/pyproject.toml"
note "S3 project: add, groups, extras, lock, sync"
rec "uv init tokcount --python 3.14 -q && cd tokcount && uv add 'httpx>=0.28' -q && uv add --dev pytest -q && uv add --optional fast orjson -q && sed -n '/^dependencies/,\$p' pyproject.toml"
cd tokcount
rec "uv tree --depth 1"
rec "grep -c '^\[\[package\]\]' uv.lock; grep -A3 'name = \"httpx\"' uv.lock | head -4"
rec "uv run python -c 'import httpx, sys; print(httpx.__version__, sys.prefix.endswith(\".venv\"))'"
rec "python3 -c 'import httpx' 2>&1 | tail -1"
rec "uv sync --locked && echo in sync"
note "edit pyproject.toml by hand: add rich to dependencies without uv add"
python3 - <<'PY'
s=open('pyproject.toml').read().replace('"httpx>=0.28",','"httpx>=0.28",\n    "rich",',1); open('pyproject.toml','w').write(s)
PY
rec "uv sync --locked"
rec "uv lock && uv sync --locked && echo in sync again"
rec "uv sync --extra fast && uv run python -c 'import orjson; print(orjson.__version__)'"
rec "uv sync && uv run python -c 'import orjson' 2>&1 | tail -1"
rec "uv export --format requirements.txt --no-hashes --no-dev | grep -v '^#' | head -5"
rec "uv export --format pylock.toml -o pylock.toml > /dev/null 2>&1 && sed -n 3,5p pylock.toml && grep -c 'packages]]' pylock.toml"
note "S4 scripts with inline metadata (PEP 723)"
cd $D
cat > fetch_title.py <<'PY'
import re
import sys

import httpx

html = "<html><head><title>uv scripts</title></head></html>"
print(re.search(r"<title>(.*?)</title>", html).group(1), "| httpx", httpx.__version__, "|", sys.version.split()[0])
PY
rec "uv run --no-project fetch_title.py 2>&1 | tail -1"
rec "uv add --script fetch_title.py 'httpx>=0.28' -q && head -8 fetch_title.py"
rec "uv run fetch_title.py 2>&1 | tail -1"
note "S5 tools"
rec "uvx ruff@0.16.10 --version"
rec "uvx --from 'cowsay==6.1' cowsay -t moo | head -3"
note "S6 workspace"
rec "uv init ws -q --bare && cd ws && uv init packages/core --lib -q && uv init apps/cli --package -q && cat pyproject.toml && cd apps/cli && uv add core -q && sed -n '/dependencies/,\$p' pyproject.toml"
rec "cd ws && find . -name uv.lock -o -name pyproject.toml | sort && uv run --package cli cli"
note "S7 the pip interface"
rec "uv venv old-style -q --python 3.13 && VIRTUAL_ENV=old-style uv pip install -q 'httpx==0.28.1' && VIRTUAL_ENV=old-style uv pip list | head -5"
note "S8 build"
cd $D/lib-demo
rec "uv build 2>&1 | grep -E 'Successfully|Building'"
rec "unzip -l dist/lib_demo-0.1.0-py3-none-any.whl | awk 'NR>3{print \$4}' | grep -v '^\$'"
rec "unzip -p dist/lib_demo-0.1.0-py3-none-any.whl lib_demo-0.1.0.dist-info/WHEEL"
rec "tar tzf dist/lib_demo-0.1.0.tar.gz"
rec "uv publish --dry-run 2>&1 | head -4"
sed -e "s#$WORK/demo#~/demo#g" -e "s#$PL#~/pl#g" -e "s#$HOME#~#g" $TRANSCRIPT > $HERE/../out/uv.txt
echo done
