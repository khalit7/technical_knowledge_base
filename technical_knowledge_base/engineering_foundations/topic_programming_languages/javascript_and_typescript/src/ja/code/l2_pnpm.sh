# The same three dependencies with npm, pnpm and bun, then a timed reinstall from each lockfile
# into an empty node_modules (what CI does), caches warm: hyperfine, 5 runs each.
set -e
for tool in npm pnpm bun; do
  rm -rf "$WORK/$tool-demo" && mkdir -p "$WORK/$tool-demo" && cd "$WORK/$tool-demo"
  printf '{ "name": "%s-demo", "version": "1.0.0", "type": "module" }\n' $tool > package.json
  case $tool in
    npm)  npm install zod@4.6.5 express@5.2.1 vitest@5.0.3 --no-audit --no-fund >/dev/null 2>&1; CI="npm ci --no-audit --no-fund" ;;
    pnpm) pnpm add zod@4.6.5 express@5.2.1 vitest@5.0.3 >/dev/null 2>&1; CI="pnpm install --frozen-lockfile" ;;
    bun)  bun add zod@4.6.5 express@5.2.1 vitest@5.0.3 >/dev/null 2>&1; CI="bun install --frozen-lockfile" ;;
  esac
  hyperfine --runs 5 --warmup 1 --prepare 'rm -rf node_modules' "$CI" --export-json "$WORK/$tool-ci.json" >/dev/null 2>&1
  echo "$tool: lockfile $(ls *lock* | tr -d '\n'), top-level entries in node_modules $(ls -A node_modules | wc -l | tr -d ' '), '$CI' median $(python3 -c "import json;print(round(json.load(open('$WORK/$tool-ci.json'))['results'][0]['median'],2))") s"
done
cd "$WORK/pnpm-demo"
echo '$ readlink node_modules/express   # pnpm: a link into .pnpm, which hard-links files from one global store'; readlink node_modules/express
echo '$ ls node_modules/debug   # not declared by you, so not importable (npm would hoist it)'; ls node_modules/debug 2>&1 | sed 's|.*: |ls: |'
