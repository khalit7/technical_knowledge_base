# A new project with npm: package.json, one dependency without dependencies (zod), one with many (express).
# Runs in a scratch folder $WORK; npm's cache is warm, so times measure installing, not downloading.
set -e
rm -rf "$WORK/npm-demo" && mkdir -p "$WORK/npm-demo" && cd "$WORK/npm-demo"
echo '$ npm init -y && npm pkg set type=module'; npm init -y >/dev/null && npm pkg set type=module
echo '$ npm install zod@4.6.5'; npm install zod@4.6.5 --no-audit --no-fund 2>&1 | grep -v '^$'
echo '$ npm install express@5.2.1'; npm install express@5.2.1 --no-audit --no-fund 2>&1 | grep -v '^$'
echo '$ npm install -D vitest@5.0.3'; npm install -D vitest@5.0.3 --no-audit --no-fund 2>&1 | grep -v '^$'
echo '$ cat package.json'; cat package.json
echo '$ ls node_modules | wc -l   # top-level folders: a flat tree with everyone'"'"'s dependencies hoisted'; ls node_modules | wc -l | tr -d ' '
echo '$ du -sh node_modules'; du -sh node_modules | cut -f1
echo '$ npm ls --depth=0'; npm ls --depth=0
echo '$ npm ls debug   # who pulled this in?'; npm ls debug
echo '$ grep -c "\"node_modules/" package-lock.json   # packages pinned in the lockfile'; grep -c '"node_modules/' package-lock.json
