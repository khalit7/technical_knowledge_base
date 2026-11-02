// Checks the in-page rounding engine (parts/20_js_sim.js) and writes the numbers the page quotes.
//   node check_sim.mjs            writes inputs/sim.json and inputs/sim_rtn_cases.json, exits 1 on a failed check
//   check_sim.py then compares the round-to-nearest cases with ml_dtypes' bfloat16 (the same rounding as torch).
// Exact checks, no sampling: stochastic rounding is checked by enumerating all 65,536 noise values.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
eval(fs.readFileSync(path.join(here, 'parts/20_js_sim.js'), 'utf8'));
const S = globalThis.FCSIM; const bad = [];
// 1. round-to-nearest cases for check_sim.py (fp32 values: random, midpoints, negatives, tiny, large)
const g = S.rng(12345), cases = [];
const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
for (let i = 0; i < 1500; i++) { u32[0] = ((g() * 2 ** 32) >>> 0); if (((u32[0] >>> 23) & 0xff) === 0xff) continue; cases.push(f32[0]) }
for (let i = 0; i < 500; i++) { f32[0] = (g() - 0.5) * 0.2; u32[0] = (u32[0] & 0xffff0000) | 0x8000; cases.push(f32[0]) }  // exact midpoints: ties to even
const out = cases.map(x => [x, S.rtn(x)]);
fs.writeFileSync(path.join(here, 'inputs/sim_rtn_cases.json'), JSON.stringify(out));
// 2. stochastic rounding: P(up) equals the fractional position exactly (all 65,536 noise values)
let srMax = 0;
for (let i = 0; i < 300; i++) {
  f32[0] = (g() - 0.5) * 0.1; const x = f32[0]; const lo = S.sr(x, 0), hi = S.sr(x, 0xffff) === lo ? lo : S.sr(x, 0xffff);
  let up = 0; for (let r = 0; r < 65536; r++) if (S.sr(x, r) !== lo) up++;
  const frac = hi === lo ? 0 : (x - lo) / (hi - lo); const e = Math.abs(up / 65536 - frac); srMax = Math.max(srMax, e);
  const mean = (lo * (65536 - up) + hi * up) / 65536; if (Math.abs(mean - x) > 1e-12 * Math.max(1, Math.abs(x))) bad.push('SR mean ' + x + ' -> ' + mean);
}
if (srMax > 1e-9) bad.push('SR probability off by ' + srMax);
// 3. the gap function against the definition u = 2^(floor(log2|w|) - 7)
for (const w of [0.005, 0.02, 0.0156, 0.03125, 0.08, 1.5]) { const want = 2 ** (Math.floor(Math.log2(w)) - 7); if (S.gap(w) !== want) bad.push('gap ' + w) }
// 4. the runs the page quotes
const DEF = { w0: 0.02, eta: 1e-6, drift: 0.5, noise: 0.5, T: 300, seed: 1, reps: 256 };
const summ = r => {
  const T = r.T, k = T, lagN = (r.th[k] - r.qn[k]) / r.meanStep;
  let maxLag = 0; for (let t = 0; t <= T; t++) maxLag = Math.max(maxLag, (r.th[t] - r.qn[t]) / r.meanStep);
  let srDev = 0; for (let t = 1; t <= T; t++) srDev = Math.max(srDev, Math.abs(r.qm[t] - r.th[t]) / r.u);
  return { w0: r.w0, u: r.u, half: r.u / 2, deadSteps: r.u / 2 / r.meanStep, first: r.first, changes: r.ch,
    pctN: 100 * r.ch.n / T, pctS: 100 * r.ch.s / T, pctE: 100 * r.ch.e / T, lagEndN: lagN, maxLagN: maxLag,
    gapEndU: { n: (r.th[k] - r.qn[k]) / r.u, s: (r.th[k] - r.qs[k]) / r.u, e: (r.th[k] - r.qe[k]) / r.u, m: (r.th[k] - r.qm[k]) / r.u }, srMeanMaxDevU: srDev };
};
const res = { defaults: DEF, def: summ(S.run(DEF)), steady: summ(S.run({ ...DEF, noise: 0 })),
  // the dead zone in steps for each weight size the page offers, steady update eta * drift
  dead: Object.fromEntries([0.005, 0.02, 0.08].map(w => [w, S.gap(S.rtn(w)) / 2 / (DEF.eta * DEF.drift)])) };
if (res.steady.first.n < 100 || res.steady.first.n > 140) bad.push('steady first change ' + res.steady.first.n);
if (res.def.srMeanMaxDevU > 0.2) bad.push('SR replica mean strays ' + res.def.srMeanMaxDevU);
if (Math.abs(res.def.gapEndU.e) > 0.5 + 1e-9) bad.push('EF gap above u/2');
fs.writeFileSync(path.join(here, 'inputs/sim.json'), JSON.stringify(res, null, 1) + '\n');
console.log('check_sim: rtn cases', out.length, '; SR max prob error', srMax, '; steady first change at step', res.steady.first.n,
  '; default run changes', res.def.changes, '; problems', bad.length, bad.join(' | '));
process.exit(bad.length ? 1 : 0);
