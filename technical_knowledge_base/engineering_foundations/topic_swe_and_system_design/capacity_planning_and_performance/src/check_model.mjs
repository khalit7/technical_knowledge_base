// Runs the page's model (parts/21_js_model.js) on every case in recompute_out.json and compares
// with the Python results (relative tolerance 1e-9). Run from src/: node check_model.mjs
import fs from 'fs'; import vm from 'vm';
const ctx = { window: {}, Math }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('parts/21_js_model.js', 'utf8'), ctx);
const CP = ctx.window.CP;
const R = JSON.parse(fs.readFileSync('recompute_out.json', 'utf8'));
let n = 0, bad = 0, maxrel = 0;
function cmp(a, b, path) {
  if (typeof b === 'number' || b === 'inf' || b === 'Infinity') {
    n++;
    const bb = (b === 'inf' || b === 'Infinity') ? Infinity : b;
    if (a === bb) return;
    const rel = Math.abs(a - bb) / Math.max(1e-300, Math.abs(bb));
    maxrel = Math.max(maxrel, rel);
    if (!(rel < 1e-9)) { bad++; if (bad < 10) console.log('DIFF', path, a, bb); }
  } else if (Array.isArray(b)) { if (a.length !== b.length) { bad++; console.log('LEN', path, a.length, b.length); return; } b.forEach((x, i) => cmp(a[i], x, path + '[' + i + ']')); }
  else if (b && typeof b === 'object') for (const k of Object.keys(b)) cmp(a[k], b[k], path + '.' + k);
}
for (const c of R.cases) {
  const r = CP[c.fn](...c.args);
  const o = c.fn === 'stampede' ? { db: r.db, waits: r.waits, starts: r.starts } : r;
  cmp(o, c.out, c.name);
}
console.log(`checked ${n} numbers in ${R.cases.length} cases: ${bad} differ; max relative difference ${maxrel.toExponential(2)}`);
process.exit(bad ? 1 : 0);
