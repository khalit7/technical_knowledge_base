// Run parts/22c_js_new.js (the two-layer network and the gradient-product toy) and compare with two_layer.json (src/two_layer.py).
// usage: node src/check_new.mjs     exits 1 on any mismatch
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const H = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {}, Math, JSON, Array, Object, Number, String }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(H, 'parts/22c_js_new.js'), 'utf8'), ctx);
const M = ctx.window.MC2, E = JSON.parse(fs.readFileSync(path.join(H, 'two_layer.json'), 'utf8'));
let n = 0, bad = 0;
const flat = a => Array.isArray(a) ? a.flat(3) : [a];
function cmp(name, a, b, rel = 1e-9) { n++; const x = flat(a), y = flat(b);
  const err = x.length !== y.length ? Infinity : Math.max(0, ...x.map((v, i) => Math.abs(v - y[i]) / Math.max(1, Math.abs(y[i]))));
  if (!(err <= rel)) { bad++; console.log('MISMATCH', name, err); } }
const t = M.two();
for (const k of ['a', 'h', 'z', 'p', 'loss', 'gz', 'gW2', 'gh', 'ga', 'gW1', 'gx', 'p_new', 'loss_new']) cmp('two ' + k, t[k], E.two[k], 1e-12);
for (const [g, r] of Object.entries(E.vanish.runs)) { const v = M.vanish(+g);
  for (const a of ['linear', 'tanh']) cmp('vanish g=' + g + ' ' + a, v[a], r[a], 1e-9); }
console.log(`check_new: ${n} checks, ${bad} failed`); process.exit(bad ? 1 : 0);
