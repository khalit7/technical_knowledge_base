// check: no
// cmd: node strip.ts
import { stripTypeScriptTypes } from "node:module";
import { readFileSync } from "node:fs";
const src = readFileSync("demo.ts", "utf8");
console.log(stripTypeScriptTypes(src));
