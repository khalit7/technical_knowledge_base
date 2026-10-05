. ../tools_research/env.sh; . ./rec.sh
cd $PL/tools_walk/ts/hello-tokens
export TRANSCRIPT=$PL/tools_walk/ts_fix.txt; : > $TRANSCRIPT
rec "npm pkg set type=module"
python3 - <<'PY'
import re
s=open('tsconfig.json').read()
s=s.replace('"compilerOptions": {','"compilerOptions": {\n    "allowImportingTsExtensions": true,\n    "noEmit": true,',1)
s=s.replace('"types": [],','"types": ["node"],',1)
open('tsconfig.json','w').write(s)
PY
echo "## tsconfig.json edited by hand: added allowImportingTsExtensions and noEmit, types set to [\"node\"]" >> $TRANSCRIPT
rec "node src/main.ts"
rec "npx tsc"
cat > src/oops.ts <<'TS'
import { countTokens } from "./tokens.ts";

const n: number = countTokens(42);
console.log(n);
TS
echo "## src/oops.ts: passes a number where a string is expected" >> $TRANSCRIPT
rec "node src/oops.ts"
rec "npx tsc"
rm src/oops.ts
