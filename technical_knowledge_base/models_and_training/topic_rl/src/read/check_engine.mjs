// Run the page's Reading engine (parts/21_js_rd_engine.js) in Node and compare with src/read/expected.json,
// written by the independent Python implementation src/read/recompute.py.
// usage: python3 src/read/recompute.py && node src/read/check_engine.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { Math, console }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(here, '../parts/21_js_rd_engine.js'), 'utf8'), ctx);
const E = ctx.RDE, X = JSON.parse(fs.readFileSync(path.resolve(here, 'expected.json'), 'utf8'));
let n = 0, bad = 0, worst = 0;
function cmp(label, a, b) {
  if (Array.isArray(b)) { b.forEach((v, i) => cmp(label + '[' + i + ']', a[i], v)); return }
  if (b && typeof b === 'object') { for (const k of Object.keys(b)) cmp(label + '.' + k, a[k], b[k]); return }
  n++; const d = Math.abs(a - b) / Math.max(1, Math.abs(b)); worst = Math.max(worst, d);
  if (!(d <= 1e-12)) { bad++; if (bad < 15) console.log('MISMATCH', label, a, b) }
}
X.cases.forEach((c, i) => { const t = E.targets({ g: c.g, lam: c.lam, R: c.R, V: c.V, alpha: c.alpha, pDP: c.pdp });
  cmp('case ' + i, { mc: t.mc, td: t.td, two: t.two, lam: t.lam, dp: t.dp, reinforceB: t.reinforceB, delta: t.delta, updMC: t.upd(t.mc), updTD: t.upd(t.td) }, X.targets[i]) });
cmp('grpo', E.groupAdv([1, 0, 0, 0]).A, X.grpo);
cmp('grpo16', E.groupAdv([1, ...Array(15).fill(0)]).A, X.grpo16);
cmp('grpoSame', E.groupAdv(Array(8).fill(1)).A, X.grpoSame);
console.log(`engine check: ${n} values compared, ${bad} mismatches, largest relative difference ${worst.toExponential(2)}`);
process.exit(bad ? 1 : 0);
