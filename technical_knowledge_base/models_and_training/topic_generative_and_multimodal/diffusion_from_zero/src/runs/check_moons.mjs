// The two-moons block (moved from the Variational inference maths page, 2026-10-26): runs parts/29_js_dz_mcore.js in Node
// against the NumPy reference sampler (moons/sampler_ref.json), reruns three measured table cells, the no-clip cell and the
// straightness of the 40 drawn paths, and checks the numbers typed into the two blocks. Usage: node runs/check_moons.mjs (from anywhere)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const H = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = globalThis; globalThis.atob = s => Buffer.from(s, 'base64').toString('latin1');
eval(fs.readFileSync(path.join(H, 'parts/20_js_dz_1moons.js'), 'utf8'));
eval(fs.readFileSync(path.join(H, 'parts/29_js_dz_mcore.js'), 'utf8'));
let ok = 0, bad = 0;
const cmp = (name, js, ref, tol) => { const d = Math.abs(js - ref); if (d <= (tol || 1e-4)) ok++; else { bad++; console.log('MISMATCH', name, js, ref) } };
const R = JSON.parse(fs.readFileSync(path.join(H, 'moons/sampler_ref.json')));
let maxd = 0;
for (const r of R.ref) { const X = DZM.sample({ method: r.method, sched: r.sched, S: r.S, c: r.c, w: r.w, n: r.n, seed: r.seed });
  let d = 0; for (let i = 0; i < X.length; i++) d = Math.max(d, Math.abs(X[i] - r.X[i])); maxd = Math.max(maxd, d);
  if (d < 1e-6) ok++; else { bad++; console.log('SAMPLER MISMATCH', r.method, r.sched, r.S, d) } }
console.log('sampler max abs difference against NumPy:', maxd.toExponential(2));
for (const cell of R.table.filter(c => (c.m === 'ddim' && c.S === 5 && c.c === 2) || (c.m === 'flow' && c.S === 5 && c.c === 2) || (c.m === 'ddpm' && c.S === 100 && c.c === 0 && c.w === 4))) {
  const X = DZM.sample({ method: cell.m, sched: cell.s, S: cell.S, c: cell.c, w: cell.w, n: 600, seed: 11 }); const s = DZM.score(X, cell.c);
  cmp('table on ' + cell.m + cell.S, s.on, cell.on, 2e-3) }
// the numbers typed into the page's two tables and prose, against the reference table
const T = (m, s, S, c, w) => R.table.find(x => x.m === m && x.s === s && x.S === S && x.c === c && x.w === w);
const typed = [['ddpm', 'linear', 1000, 2, 0, 'on', 0.940], ['ddpm', 'linear', 100, 2, 0, 'on', 0.945], ['ddpm', 'linear', 20, 2, 0, 'on', 0.843],
  ['ddim', 'linear', 100, 2, 0, 'on', 0.900], ['ddim', 'linear', 20, 2, 0, 'on', 0.838], ['ddim', 'linear', 5, 2, 0, 'on', 0.270],
  ['ddim', 'cosine', 20, 2, 0, 'on', 0.953], ['ddim', 'cosine', 5, 2, 0, 'on', 0.787], ['flow', 'linear', 100, 2, 0, 'on', 0.880],
  ['flow', 'linear', 20, 2, 0, 'on', 0.867], ['flow', 'linear', 5, 2, 0, 'on', 0.755],
  ['ddpm', 'linear', 100, 0, 0, 'on', 0.998], ['ddpm', 'linear', 100, 0, 4, 'on', 0.993], ['ddim', 'linear', 100, 0, 4, 'on', 0.913],
  ['ddim', 'linear', 5, 0, 0, 'on', 0.375], ['ddim', 'linear', 5, 0, 0, 'match', 0.883], ['ddim', 'linear', 5, 0, 1, 'on', 0.980]];
for (const [m, s, S, c, w, k, v] of typed) { const r = T(m, s, S, c, w); cmp(`typed ${m} ${s} ${S} c${c} w${w} ${k}`, r[k], v, 6e-4) }
for (const [m, S, w, sd] of [['ddpm', 100, 0, 1.00], ['ddpm', 100, 1, 0.88], ['ddpm', 100, 4, 0.70], ['ddim', 100, 4, 0.55], ['ddim', 5, 0, 0.66], ['ddim', 5, 1, 0.56]])
  cmp(`typed sd ${m} ${S} w${w}`, T(m, 'linear', S, 0, w).sd[0], sd, 6e-3);
cmp('no clip, DDIM cosine 20', R.noclip_ddim_cosine20.on, 0.012, 6e-4);
// straightness of 40 trajectories (quoted as 0.55 and 0.73): same code path as the page
const n = 40, r = DZM.rng(77), X0 = new Float64Array(2 * n); for (let i = 0; i < 2 * n; i++) X0[i] = r.g();
const st = {}; for (const m of ['ddim', 'flow']) { const s = DZM.sampler({ method: m, sched: 'linear', S: 50, c: 2, w: 0, n, seed: 1, X0 }); const P = [Float64Array.from(s.X)]; while (s.step()) P.push(Float64Array.from(s.X)); P.push(Float64Array.from(s.X));
  let ratio = 0; for (let p = 0; p < n; p++) { let len = 0; for (let k = 1; k < P.length; k++) len += Math.hypot(P[k][2 * p] - P[k - 1][2 * p], P[k][2 * p + 1] - P[k - 1][2 * p + 1]); ratio += Math.hypot(P[P.length - 1][2 * p] - P[0][2 * p], P[P.length - 1][2 * p + 1] - P[0][2 * p + 1]) / len } st[m] = ratio / n }
console.log('straightness (40 paths, 50 steps): ddim', st.ddim.toFixed(3), 'flow', st.flow.toFixed(3));
cmp('straightness ddim 0.73', st.ddim, 0.73, 0.005); cmp('straightness flow 0.55', st.flow, 0.55, 0.005);
console.log('check_moons: ok', ok, 'mismatches', bad); process.exit(bad ? 1 : 0);
