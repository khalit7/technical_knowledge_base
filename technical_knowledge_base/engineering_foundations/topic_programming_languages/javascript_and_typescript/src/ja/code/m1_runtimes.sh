# One script, three runtimes. Bun (JavaScriptCore engine) and Deno (V8, Rust) run Node-style code too.
cat > "$WORK/rt.mjs" <<'JS'
import { readFileSync } from "node:fs";
const n = readFileSync(new URL(import.meta.url)).length;
console.log(`${typeof Bun !== "undefined" ? "bun " + Bun.version : typeof Deno !== "undefined" ? "deno " + Deno.version.deno : "node " + process.versions.node}: read my own ${n} bytes`);
JS
cd "$WORK"
echo '$ node rt.mjs'; node rt.mjs
echo '$ bun rt.mjs'; bun rt.mjs
echo '$ deno run rt.mjs   # Deno denies file access unless you grant it'; deno run --no-prompt rt.mjs 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | head -3
echo '$ deno run --allow-read rt.mjs'; deno run --allow-read rt.mjs
