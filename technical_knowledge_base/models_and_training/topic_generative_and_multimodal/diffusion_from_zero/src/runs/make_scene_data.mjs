// The data behind the 3D stages (2026-11-09 rollout): runs the page's own two-moons networks and samplers (parts/29_js_dz_mcore.js,
// the same code the page runs and check_moons.mjs proves equal to the NumPy reference) and writes parts/30_js_sc0data.js (window.DZSC).
// Positions are quantised to one byte per coordinate (3.5 / 127 units, base64) so the stages cost a few KB; every number the step
// lists quote is computed here from the unquantised samples and asserted equal to the measured table in moons/sampler_ref.json.
// CPU, about 20 seconds. Usage: node src/runs/make_scene_data.mjs (from anywhere)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const H = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = globalThis; globalThis.atob = s => Buffer.from(s, 'base64').toString('latin1');
eval(fs.readFileSync(path.join(H, 'parts/20_js_dz_1moons.js'), 'utf8'));
eval(fs.readFileSync(path.join(H, 'parts/29_js_dz_mcore.js'), 'utf8'));
const REF = JSON.parse(fs.readFileSync(path.join(H, 'moons/sampler_ref.json')));
const Q = 3.5 / 127, q8 = A => Buffer.from(Array.from(A, v => Math.max(1, Math.min(255, Math.round(v / Q) + 128)))).toString('base64');
const r3 = v => Math.round(v * 1000) / 1000;
const tab = (m, s, S, c, w) => REF.table.find(x => x.m === m && x.s === s && x.S === S && x.c === c && x.w === w);
let bad = 0; const same = (what, a, b, tol) => { if (Math.abs(a - b) > (tol || 6e-4)) { bad++; console.log('MISMATCH', what, a, b) } };
const sdx = X => { const n = X.length / 2; let m = 0, v = 0; for (let p = 0; p < n; p++) m += X[2 * p]; m /= n; for (let p = 0; p < n; p++) v += (X[2 * p] - m) ** 2; return Math.sqrt(v / n) };
const N = 600, SEED = 11, KEEP = 40;   // the measured table's samples (600, seed 11); the first 40 are drawn as paths

// one run of the page's sampler, recording the first KEEP points at every step (subsampled to at most 51 frames) and the levels visited
function run(o) {
  const s = DZM.sampler(Object.assign({ n: N, seed: SEED }, o)), fr = [Float64Array.from(s.X.subarray(0, 2 * KEEP))], ts = DZM.tsteps(o.S), lev = [o.method === 'flow' ? 1 : ts[ts.length - 1]];
  let k = 0; const every = Math.max(1, Math.round(o.S / 50));
  while (!s.done) { s.step(); k++; if (k % every === 0 || s.done) { fr.push(Float64Array.from(s.X.subarray(0, 2 * KEEP))); lev.push(o.method === 'flow' ? 1 - k / o.S : (k < o.S ? ts[o.S - 1 - k] : 0)) } }
  const sc = DZM.score(s.X, o.c);
  return { X: s.X, out: { paths: fr.map(q8), lev, end: q8(s.X), on: r3(sc.on), match: sc.match == null ? null : r3(sc.match), sd: r3(sdx(s.X)) } };
}
const out = { q: Q, n: N, seed: SEED, keep: KEEP };

// Fig. 1 (hero): 300 two-moons points (the closed block's set, DZM.moons(300, 21)) noised in closed form with one fixed noise draw
// (computed in the browser), then walked back by DDIM, 50 network calls, from where the forward process ended (t = 1,000).
{ const D = DZM.moons(300, 21), r = DZM.rng(41), E = new Float64Array(600); for (let i = 0; i < 600; i++) E[i] = r.g();
  const a = DZM.abar('linear', 1000), X0 = new Float64Array(600); for (let i = 0; i < 600; i++) X0[i] = Math.sqrt(a) * D.X[i] + Math.sqrt(1 - a) * E[i];
  const s = DZM.sampler({ method: 'ddim', sched: 'linear', S: 50, c: 2, w: 0, n: 300, seed: 1, X0 }), ts = DZM.tsteps(50), want = [750, 500, 250, 0], fr = [];
  let k = 0; while (!s.done) { s.step(); k++; const lv = k < 50 ? ts[49 - k] : 0; // after k calls the points sit at noise level ts[49 - k]
    for (const w of want) if (lv <= w && !fr.find(f => f.w === w)) fr.push({ w, lev: lv, calls: k, X: q8(s.X) }) }
  const sc = DZM.score(s.X, 2);
  out.hero = { back: fr, on: r3(sc.on), calls: 50 };
  console.log('hero: back frames at', fr.map(f => f.w + '<-' + f.lev + '@' + f.calls).join(' '), 'on data', sc.on); }

// Fig. 4 (samplers): the same 600 noise draws through DDIM and DDPM at 100 steps, DDIM at 1 step, DDIM at 5 steps on two schedules
{ const S = {};
  for (const [k, o] of Object.entries({ ddim100: { method: 'ddim', sched: 'linear', S: 100 }, ddpm100: { method: 'ddpm', sched: 'linear', S: 100 },
    ddim1: { method: 'ddim', sched: 'linear', S: 1 }, ddim5: { method: 'ddim', sched: 'linear', S: 5 }, ddim5cos: { method: 'ddim', sched: 'cosine', S: 5 } })) {
    const R = run(Object.assign({ c: 2, w: 0 }, o)); S[k] = R.out; console.log('samp', k, 'on', R.out.on, 'frames', R.out.paths.length) }
  same('DDIM 100 on', S.ddim100.on, tab('ddim', 'linear', 100, 2, 0).on); same('DDPM 100 on', S.ddpm100.on, tab('ddpm', 'linear', 100, 2, 0).on);
  same('DDIM 5 on', S.ddim5.on, tab('ddim', 'linear', 5, 2, 0).on); same('DDIM 5 cosine on', S.ddim5cos.on, tab('ddim', 'cosine', 5, 2, 0).on);
  // where the five evenly spaced steps sit in log-SNR, on each schedule (the levels the network is asked at)
  const lam = (s, t) => { const a = DZM.abar(s, t); return Math.log(a / (1 - a)) };
  S.ddim5.lam = DZM.tsteps(5).slice().reverse().map(t => Math.round(lam('linear', t) * 10) / 10); S.ddim5cos.lam = DZM.tsteps(5).slice().reverse().map(t => Math.round(lam('cosine', t) * 10) / 10);
  out.samp = S; }

// Fig. 5 (guidance): ask for the upper moon (c = 0), 600 samples, DDPM 100 steps at w = 0, 1, 4 and DDIM 100 steps at w = 4
{ const G = {};
  for (const [k, o] of Object.entries({ p0: { method: 'ddpm', w: 0 }, p1: { method: 'ddpm', w: 1 }, p4: { method: 'ddpm', w: 4 }, i4: { method: 'ddim', w: 4 } })) {
    const R = run(Object.assign({ sched: 'linear', S: 100, c: 0 }, o)); delete R.out.paths; delete R.out.lev; G[k] = R.out;
    const t = tab(o.method, 'linear', 100, 0, o.w); same('cfg ' + k + ' on', R.out.on, t.on); same('cfg ' + k + ' match', R.out.match, t.match); same('cfg ' + k + ' sd', R.out.sd, t.sd[0], 2e-3);
    console.log('cfg', k, R.out) }
  out.cfg = G; }

const P = path.join(H, 'parts', '30_js_sc0data.js');
fs.writeFileSync(P, '// The 3D stages\' two-moons runs (src/runs/make_scene_data.mjs; do not edit): positions one byte per coordinate, scale q\nwindow.DZSC=' + JSON.stringify(out) + ';\n');
console.log(P, fs.statSync(P).size, 'bytes; mismatches against the measured table:', bad); process.exit(bad ? 1 : 0);
