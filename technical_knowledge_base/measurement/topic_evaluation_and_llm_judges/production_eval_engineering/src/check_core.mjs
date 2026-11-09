// Run the page's shared JS (parts/21_js_common.js) on inputs/gate_data.json in node and compare with recompute.json.
import fs from 'fs';import vm from 'vm';import path from 'path';import { fileURLToPath } from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
const window = { PE: JSON.parse(fs.readFileSync(path.join(H, 'inputs/gate_data.json'))) };
vm.runInNewContext(fs.readFileSync(path.join(H, 'parts/21_js_common.js'), 'utf8'), { window, Math, JSON, String });
const C = window.PEC, R = JSON.parse(fs.readFileSync(path.join(H, 'recompute.json')));
let bad = 0, n = 0; const near = (a, b, tol, what) => { n++; if (Math.abs(a - b) > tol) { bad++; console.log('MISMATCH', what, a, b) } };
const A = C.byName['claude-v1'].s, B = C.byName['claude-instant-v1'].s;
const O = { aggTol: .25, sliceTol: .5, conf: .95, escalate: true, aggSig: false };
const G = C.gate(A, B, O);
for (const k of ['mean', 'lo', 'hi']) near(G.agg[k], R.swap.agg[k], 0.002, 'agg ' + k);
for (const k of ['worse', 'same', 'better', 'n']) near(G.agg[k], R.swap.agg[k], 0, 'agg ' + k);
for (const r of G.slices) { for (const k of ['mean', 'lo', 'hi']) near(r[k], R.swap.slices[r.cat][k], 0.003, r.cat + ' ' + k); n++; if (r.v !== R.swap.slices[r.cat].v) { bad++; console.log('VERDICT', r.cat, r.v) } }
for (const [k, v] of Object.entries(R.t_quantiles)) { const [c, df] = k.split('_'); near(C.tq(+c, +df), v, 0.003, 't ' + k) }
near(C.mean(B), R.leaderboard.instant_dropped, 0.0005, 'instant mean');
let pass = 0, hid = 0;
for (const a of C.models) for (const b of C.models) { if (a === b) continue; const g = C.gate(a.s, b.s, O); if (g.aggV === 'pass') { pass++; if (g.slices.some(r => r.v === 'fail')) hid++ } }
near(pass, R.all_pairs.agg_pass, 0, 'all pairs agg pass'); near(hid, R.all_pairs.agg_pass_slice_fail, 0, 'all pairs hidden');
// Fig. 1's numbers: parts/22_js_vals.js run on a stub page, against recompute.py's independent shuffles
{ const document = { querySelectorAll: () => [], getElementById: () => null };
  vm.runInNewContext(fs.readFileSync(path.join(H, 'parts/22_js_vals.js'), 'utf8'), { window, document, Math, JSON, String, Set, console });
  const E = window.PES.ea, Q = R.ea;
  near(E.traces.length, Q.traces, 0, 'ea traces'); near(E.fails.length, Q.fails, 0, 'ea fails'); near(E.med, Q.med, 0, 'ea median'); near(E.p90, Q.p90, 0, 'ea p90'); near(E.w100, Q.w100, 0, 'ea within 100');
  n++; if (E.satPos.join() !== Q.satPos.join()) { bad++; console.log('MISMATCH ea satPos', E.satPos, Q.satPos) }
  n++; if (E.modes.map(m => m.c + m.n).join() !== Q.modes.map(m => m[0] + m[1]).join()) { bad++; console.log('MISMATCH ea modes') }
  n++; if (E.worst.map(w => [w.q, w.t, w.a, w.b].join(' ')).join() !== Q.worst.map(w => w.join(' ')).join()) { bad++; console.log('MISMATCH ea worst') } }
console.log(`check_core: ${n} checks, ${bad} mismatches`);
