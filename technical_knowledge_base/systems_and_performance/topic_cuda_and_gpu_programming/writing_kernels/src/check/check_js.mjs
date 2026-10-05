// From src/: run the page's model code (parts/31_js_tree0.js, parts/32_js_fa.js) in node and compare with the
// independent Python implementations (tree_model.py -> out/tree_expected.json, fa_model.py -> out/fa_expected.json).
import fs from 'fs';
globalThis.window = globalThis; globalThis.document = { getElementById: () => null };
eval(fs.readFileSync('parts/31_js_tree0.js', 'utf8'));
const fa = fs.readFileSync('parts/32_js_fa.js', 'utf8'); eval(fa.slice(0, fa.indexOf('(function(){\n  const F=')));
let bad = 0, n = 0;
const T = JSON.parse(fs.readFileSync('out/tree_expected.json', 'utf8'));
for (const [m, e] of Object.entries(T)) { const r = WKT.run(m); n++;
  if (JSON.stringify(r.states[r.states.length - 1]) !== JSON.stringify(e.final)) { bad++; console.log('tree final', m); }
  for (const k of Object.keys(e.tot)) if (r.tot[k] !== e.tot[k]) { bad++; console.log('tree', m, k, r.tot[k], e.tot[k]); } }
const F = JSON.parse(fs.readFileSync('out/fa_expected.json', 'utf8'));
for (const m of ['k', 'q']) { let w = 0, r = 0, b = 0; WKFA.split(m).forEach(s => { w += s.w; r += s.r; b += s.b }); n++;
  const e = F.split[m]; if (w !== e.w || r !== e.r || b !== e.b) { bad++; console.log('split', m, w, r, b, e); } }
for (const [k, e] of Object.entries(F.sched)) { const [m, r] = k.split('@'); const q = WKFA.schedule(m, +r, 8); n++;
  if (Math.abs(q.end - e.end) > 1e-9 || Math.abs(q.util - e.util) > 1e-6 || q.tasks.length !== e.n) { bad++; console.log('sched', k, q.end, q.util, e); } }
console.log(`${n} model cases compared with Python, ${bad} mismatches`); process.exit(bad ? 1 : 0);
