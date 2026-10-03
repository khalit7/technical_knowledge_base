// Run the page's FP8 simulator (parts/12_js_fp8core.js) in node and compare it with fp8_sim.py's results
// (inputs/fp8_sim.json): every number must match exactly. usage: node check_fp8.mjs   (from src/)
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { globalThis: {} }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, 'parts/12_js_fp8core.js'), 'utf8'), ctx);
const F = ctx.FP8, R = JSON.parse(fs.readFileSync(path.join(here, 'inputs/fp8_sim.json'), 'utf8'));
let n = 0, bad = [];
for (const [k, v] of Object.entries(R.scaling)) {
  const [kind, mode, fmt, mag] = k.split('|'); const r = F.scalingRun(1, kind, +mag, fmt, mode);
  for (const f of ['zeros', 'sub', 'median_rel', 'p90_rel', 'n']) { n++; if (r[f] !== v[f]) bad.push(`${k} ${f}: js ${r[f]} py ${v[f]}`) }
}
for (const [k, v] of Object.entries(R.acc)) {
  const [dist, reading, nc, K] = k.split('|'); n++; const r = F.accRun(1, +K, dist, reading, +nc);
  if (Math.abs(r - v) > 1e-15 * Math.max(1, Math.abs(v))) bad.push(`acc ${k}: js ${r} py ${v}`);
}
const p = F.dotInputs(1, 4096, 'uniform');
const d = { exact: F.exactSum(p), A0: F.accumulate(p, 'A', 0), A128: F.accumulate(p, 'A', 128), B0: F.accumulate(p, 'B', 0), B128: F.accumulate(p, 'B', 128) };
for (const k of Object.keys(d)) { n++; if (d[k] !== R.dot[k]) bad.push(`dot ${k}: js ${d[k]} py ${R.dot[k]}`) }
for (const [x, [a, b]] of Object.entries(R.q8_samples)) { n += 2; if (F.q8(+x, 'e4m3') !== a || F.q8(+x, 'e5m2') !== b) bad.push(`q8 ${x}`) }
const res = { compared: n, mismatches: bad.length, examples: bad.slice(0, 5) };
fs.writeFileSync(path.join(here, 'inputs/check_fp8.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res)); process.exit(bad.length ? 1 : 0);
