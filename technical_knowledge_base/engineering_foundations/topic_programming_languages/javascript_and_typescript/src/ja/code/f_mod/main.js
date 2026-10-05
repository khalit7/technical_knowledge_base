// main.js: named imports, a default import, a CommonJS import, a dynamic import and top-level await
import top, { countTokens } from "./tokens.js";     // the extension is required in Node ESM
import { countTokens as again } from "./tokens.js"; // a second import does not re-run the module
import legacy from "./legacy.cjs";                   // CommonJS: module.exports arrives as the default
const { readFile } = await import("node:fs/promises"); // dynamic import returns a promise; top-level await is fine in ESM
console.log(countTokens("x86_64 is 2 tokens"), again === countTokens, legacy.shout("ok"));
console.log(top(new Map([["u1", 3], ["u2", 9]]), 1));
console.log(JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8")).type);
console.log(typeof require, typeof import.meta.url, import.meta.filename.split("/").pop());
