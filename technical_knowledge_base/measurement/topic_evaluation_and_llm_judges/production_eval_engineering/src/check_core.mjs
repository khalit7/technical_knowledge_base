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
console.log(`check_core: ${n} checks, ${bad} mismatches`);
