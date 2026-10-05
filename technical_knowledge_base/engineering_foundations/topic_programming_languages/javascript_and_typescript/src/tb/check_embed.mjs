// Confirms that ../../index.html embeds exactly the recorded outputs in outputs/ (snippets, narrowing probes, LLM JSON lab, timings).
import { readFileSync, readdirSync } from "node:fs";
const here = new URL(".", import.meta.url).pathname;
const html = readFileSync(here + "../../index.html", "utf8");
const m = html.match(/window\.TB=(\{.*?\});\n/s);
if (!m) { console.log("FAIL: window.TB not found"); process.exit(1); }
const TB = JSON.parse(m[1].replace(/<\\\/(script)/gi, "</$1"));
let bad = 0, n = 0;
for (const f of readdirSync(here + "outputs").filter(f => f.endsWith(".txt") && !f.includes("bench"))) {
  const name = f.slice(0, -4); n++;
  const want = readFileSync(here + "outputs/" + f, "utf8").replace(/\n$/, "");
  if (!TB.snip[name]) { console.log("missing on page:", name); bad++; continue; }
  if (TB.snip[name].out !== want) { console.log("differs:", name); bad++; }
}
const same = (a, b, label) => { n++; if (JSON.stringify(a) !== JSON.stringify(b)) { console.log("differs:", label); bad++; } };
same(TB.narrow, JSON.parse(readFileSync(here + "outputs/narrow.json", "utf8")), "narrow.json");
same(TB.zodlab, JSON.parse(readFileSync(here + "outputs/zodlab.json", "utf8")), "zodlab.json");
same(TB.bench.tsc, readFileSync(here + "outputs/tsc_bench.txt", "utf8"), "tsc_bench.txt");
same(TB.bench.startup, readFileSync(here + "outputs/startup_bench.txt", "utf8"), "startup_bench.txt");
// every snippet referenced by the HTML exists in the data
const refs = [...html.matchAll(/data-tb-s="([^"]+)"/g)].map(x => x[1]);
for (const r of new Set(refs)) if (!TB.snip[r]) { console.log("HTML references a missing snippet:", r); bad++; }
console.log(`checked ${n} recorded outputs, ${new Set(refs).size} snippet references: ${bad ? bad + " problems" : "all identical"}`);
process.exit(bad ? 1 : 0);
