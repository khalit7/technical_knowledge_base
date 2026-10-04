// Compare the page's JavaScript model (parts/31_js_sim_model.js) with model.py via recompute.json.
// Run: node check_js.mjs (from src/sim). Exits 1 on any mismatch beyond 1e-9 relative.
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {}, Math, Float64Array, Object, Array, Infinity, console }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(H, '../parts/31_js_sim_model.js'), 'utf8'), ctx);
const SM = ctx.window.SM; const R = JSON.parse(fs.readFileSync(path.join(H, 'recompute.json'), 'utf8'));
const D = JSON.parse(fs.readFileSync(path.join(H, 'defaults.json'), 'utf8'));
let bad = 0, n = 0, worst = 0;
const num = x => x === 'inf' ? Infinity : x;
function cmp(a, b, where) {
  n++; a = num(a); b = num(b);
  if (a === null || b === null) { if (a !== b) { bad++; console.log('MISMATCH', where, a, b) } return }
  if (!isFinite(a) || !isFinite(b)) { if (a !== b) { bad++; console.log('MISMATCH', where, a, b) } return }
  const r = Math.abs(a - b) / Math.max(1e-300, Math.abs(a), Math.abs(b)); worst = Math.max(worst, r);
  if (r > 1e-9 && Math.abs(a - b) > 1e-15) { bad++; console.log('MISMATCH', where, a, b) }
}
if (JSON.stringify(SM.D) !== JSON.stringify(D)) { bad++; console.log('defaults differ') }
for (const c of R.cases) {
  const o = SM.evaluate(c.st);
  for (const k in c.out.rho) cmp(o.rho[k] === null ? null : o.rho[k], c.out.rho[k], c.name + ' rho ' + k);
  for (const k in c.out.cost) cmp(o.cost[k], c.out.cost[k], c.name + ' cost ' + k);
  for (const k in c.out.lat) cmp(o.lat[k], c.out.lat[k], c.name + ' lat ' + k);
  for (const k in c.out.gpu) cmp(o.gpu[k], c.out.gpu[k], c.name + ' gpu ' + k);
  cmp(o.app.C, c.out.app_C, c.name + ' appC'); cmp(o.prim.C, c.out.prim_C, c.name + ' primC');
  if (c.out.work_avg !== undefined) cmp(o.work.rho_avg, c.out.work_avg, c.name + ' work avg');
  if (c.chain) {
    let s = c.st; const ch = [];
    for (let i = 0; i < 12; i++) { const f = SM.suggestFix(s); ch.push([f.what, f.comp]); if (!f.st) break; s = f.st }
    if (JSON.stringify(ch) !== JSON.stringify(c.chain)) { bad++; console.log('chain differs', c.name, JSON.stringify(ch), JSON.stringify(c.chain)) }
    for (const k in c.end) if (JSON.stringify(s[k]) !== JSON.stringify(c.end[k])) { bad++; console.log('end state differs', c.name, k, s[k], c.end[k]) }
  }
}
console.log(`compared ${n} numbers in ${R.cases.length} cases, worst relative difference ${worst.toExponential(2)}, mismatches ${bad}`);
process.exit(bad ? 1 : 0);
