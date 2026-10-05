// Builds outputs/narrow.json for the Narrowing stepper: for every program in narrow/*.ts,
// each marker /*@expr|caption*/ becomes a probe `expr satisfies never;` and tsc 7 reports the type it sees there.
// The page shows the program without markers, the probed types, and tsc's real errors on the clean program.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
const PL = process.env.PL || join(tmpdir(), "pl");
const TSC = PL + "/tb/node_modules/.bin/tsc";
const here = new URL(".", import.meta.url).pathname;
const base = JSON.parse(readFileSync(here + "tsconfig.base.json", "utf8"));
const MARK = /\/\*@([^|*]+)\|([^*]*)\*\/ ?/g;
function tsc(src, name) {
  const w = `${PL}/tb/work/narrow_${name}`; rmSync(w, { recursive: true, force: true }); mkdirSync(w, { recursive: true });
  writeFileSync(w + "/package.json", '{"type":"module"}');
  writeFileSync(w + "/tsconfig.json", JSON.stringify(base));
  writeFileSync(w + "/prog.ts", src);
  try { execFileSync(TSC, ["--pretty", "false"], { cwd: w, encoding: "utf8" }); return []; }
  catch (e) { return String(e.stdout).trim().split("\n").filter(Boolean); }
}
const out = {};
for (const f of readdirSync(here + "narrow").filter(f => f.endsWith(".ts")).sort()) {
  const text = readFileSync(here + "narrow/" + f, "utf8").replace(/\n$/, "");
  const lines = text.split("\n");
  const steps = [], clean = [], probed = [];
  lines.forEach((ln, i) => {
    let m; MARK.lastIndex = 0; let probeLine = ln;
    while ((m = MARK.exec(ln))) {
      const col = clean.length; // unused
      steps.push({ line: i + 1, expr: m[1], cap: m[2].trim() });
    }
    const c = ln.replace(MARK, "");
    // a line that held only a marker shows a question instead of a blank line
    clean.push(c.trim() ? c : c + "// what is " + steps[steps.length - 1].expr + " here?");
    probed.push(ln.replace(MARK, (_, ex) => `${ex} satisfies never; `));
  });
  const name = f.replace(/\.ts$/, "");
  const errs = tsc(probed.join("\n") + "\n", name + "_p");
  // match each probe to its TS1360 error (or none: the type is never)
  let si = 0;
  for (const s of steps) {
    const e = errs.find(x => x.startsWith(`prog.ts(${s.line},`) && x.includes("TS1360") && !s.used && !x._u);
    const hit = errs.filter(x => x.startsWith(`prog.ts(${s.line},`) && x.includes("TS1360"));
    s.type = hit.length ? hit[0].replace(/^.*Type '(.*)' does not satisfy the expected type 'never'\.$/, "$1") : "never";
    if (hit.length > 1) throw new Error("two probes on one line: " + f + ":" + s.line);
  }
  const cleanErrs = tsc(clean.join("\n") + "\n", name + "_c").map(x => x.replace(/^prog\.ts/, "narrow.ts"));
  let run = "";
  if (!cleanErrs.length) {
    const w = `${PL}/tb/work/narrow_${name}_c`;
    run = execFileSync("node", ["prog.ts"], { cwd: w, encoding: "utf8" }).trim();
  }
  out[name] = { code: clean, steps, tsc: cleanErrs, run };
}
writeFileSync(here + "outputs/narrow.json", JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) {
  console.log("== " + k); v.steps.forEach(s => console.log(`  L${s.line} ${s.expr}: ${s.type}`)); v.tsc.forEach(e => console.log("  ! " + e)); if (v.run) console.log("  > " + v.run);
}
