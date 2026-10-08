// Check the page's planner JavaScript against the Python reference: node check_plan.mjs
// Loads parts/33_js_plan_0data.js and 33_js_plan_1core.js in a sandbox and compares every case in out/plan_ref.json.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import {fileURLToPath} from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
const ctx = {window: {}, Math, JSON, Float64Array, Object, Array, Number, String, isFinite};
vm.createContext(ctx);
for (const f of ['33_js_plan_0data.js', '33_js_plan_1core.js']) vm.runInContext(fs.readFileSync(path.join(H, '..', 'parts', f), 'utf8'), ctx);
const Q = ctx.window.PLN;
const ref = JSON.parse(fs.readFileSync(path.join(H, 'out', 'plan_ref.json'), 'utf8'));
let n = 0, bad = 0, worst = 0;
function cmp(a, b, where) {
  if (b === null || b === undefined) { if (a !== null && a !== undefined && !(typeof a === 'object')) { bad++; console.log('extra', where, a); } return; }
  if (typeof b === 'number') {
    n++;
    const d = Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
    if (!(typeof a === 'number') || (d > 1e-7 && Math.abs(a - b) > 1e-12)) { bad++; if (bad < 15) console.log('DIFF', where, a, b); }
    else worst = Math.max(worst, Math.abs(b) > 1e-12 ? d : 0);
    return;
  }
  if (typeof b === 'boolean') { n++; if (!!a !== b) { bad++; console.log('DIFF', where, a, b); } return; }
  if (typeof b === 'object') { if (!a || typeof a !== 'object') { bad++; console.log('MISSING', where, a); return; } for (const k of Object.keys(b)) cmp(a[k], b[k], where + '.' + k); }
}
for (const [i, c] of ref.entries()) {
  if (c.rng) { const u = Q.rng(7); c.rng.forEach((v, j) => cmp(u(), v, 'rng' + j)); continue; }
  const o = c.inp, r = Q.plan(o);
  cmp(r, c.out, 'case' + i);
  const s = Q.setup(o);
  c.steps.forEach((st, j) => cmp(Q.step(o, s, st.B, st.c), st.out, 'case' + i + '.step' + j));
}
console.log(`plan check: ${n} numbers compared, ${bad} differ, worst relative difference ${worst.toExponential(2)}`);
process.exit(bad ? 1 : 0);
