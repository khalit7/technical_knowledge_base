. ../tools_research/env.sh; . ./rec.sh
W=$PL/tools_walk/ts; rm -rf $W; mkdir -p $W/hello-tokens; cd $W/hello-tokens
export TRANSCRIPT=$PL/tools_walk/ts.txt; : > $TRANSCRIPT
rec "node --version; npm --version"
rec "npm init -y"
rec "npm install --save-dev typescript @types/node vitest"
rec "npx tsc --version"
rec "npx tsc --init"
echo "## files after npm init, npm install, tsc --init (node_modules not listed)" >> $TRANSCRIPT; tree_list . >> $TRANSCRIPT; echo >> $TRANSCRIPT
echo "## package.json" >> $TRANSCRIPT; cat package.json >> $TRANSCRIPT; echo >> $TRANSCRIPT
echo "## tsconfig.json (comments stripped)" >> $TRANSCRIPT; grep -v '^\s*//' tsconfig.json | grep -v '^\s*$' >> $TRANSCRIPT; echo >> $TRANSCRIPT
echo "## node_modules size" >> $TRANSCRIPT; ls node_modules | wc -l >> $TRANSCRIPT; du -sh node_modules >> $TRANSCRIPT; echo >> $TRANSCRIPT
mkdir -p src
cat > src/tokens.ts <<'TS'
// Count runs of ASCII letters or digits.
export function countTokens(text: string): number {
  return text.match(/[A-Za-z0-9]+/g)?.length ?? 0;
}
TS
cat > src/main.ts <<'TS'
import { countTokens } from "./tokens.ts";

console.log(countTokens("Hello from hello-tokens, x86_64 café!"));
TS
cat > src/tokens.test.ts <<'TS'
import { expect, test } from "vitest";
import { countTokens } from "./tokens.ts";

test("counts ASCII runs", () => {
  expect(countTokens("x86_64 café")).toBe(3);
});
TS
echo "## src/tokens.ts, src/main.ts, src/tokens.test.ts written by hand" >> $TRANSCRIPT
rec "node src/main.ts"
rec "npx tsc --noEmit"
rec "npx vitest run"
