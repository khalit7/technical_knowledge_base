// Check the page's JavaScript maths (parts/22_js_core.js) against src/recompute.py (inputs/numbers.json).
// usage: node src/check_js.mjs   (run python3 src/recompute.py first)
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {}, Math, Float64Array, Map, Infinity };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, 'parts', '22_js_core.js'), 'utf8'), ctx);
const IT = ctx.window.IT, N = JSON.parse(fs.readFileSync(path.join(here, 'inputs', 'numbers.json'), 'utf8'));
let ok = 0, bad = 0;
const near = (name, js, py, tol) => {
  const a = Array.isArray(js) ? js : [js], b = Array.isArray(py) ? py : [py];
  const good = a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= (tol ?? 6e-4));
  if (good) ok++; else { bad++; console.log('MISMATCH', name, JSON.stringify(js), JSON.stringify(py)); }
};
const r = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const p = IT.softmax([2, 1, 0]);
near('p', p.map(v => r(v, 3)), N.p);
near('H_tiny_bits', IT.H(p, 2), N.H_tiny_bits);
near('loss_sat_nats', -Math.log(p[2]), N.loss_sat_nats);
const w = [0.5, 0.25, 0.25], wq = [0.25, 0.5, 0.25];
near('w_H', IT.H(w, 2), N.w_H); near('w_CE', IT.CE(w, wq, 2), N.w_CE); near('w_KL', IT.KL(w, wq, 2), N.w_KL);
near('coin09', IT.H([0.9, 0.1], 2), N.coin09);
near('kl_fair_09', IT.KL([0.5, 0.5], [0.9, 0.1], 2), N.kl_fair_09); near('kl_09_fair', IT.KL([0.9, 0.1], [0.5, 0.5], 2), N.kl_09_fair);
near('g_H3', IT.H([1 / 2, 1 / 3, 1 / 6], 2), N.g_H3);
const hu = IT.huffman(p);
near('huff_tiny_len', hu.len, N.huff_tiny_len, 0);
near('huff_tiny_L', p.reduce((s, v, i) => s + v * hu.len[i], 0), N.huff_tiny_L);
// blocks of 2, 3, 4 in itertools.product order
for (const [n, L] of N.huff_blocks) {
  let probs = [1]; for (let k = 0; k < n; k++) { const nx = []; probs.forEach(a => p.forEach(b => nx.push(a * b))); probs = nx; }
  const h = IT.huffman(probs); near('huff_block_' + n, probs.reduce((s, v, i) => s + v * h.len[i], 0) / n, L);
}
const pa = [1 / 2, 1 / 4, 1 / 8, 1 / 8], qa = [1 / 8, 1 / 2, 1 / 4, 1 / 8];
near('an_H', IT.H(pa, 2), N.an_H); near('an_CE', IT.CE(pa, qa, 2), N.an_CE); near('an_KL', IT.KL(pa, qa, 2), N.an_KL); near('an_KLrev', IT.KL(qa, pa, 2), N.an_KLrev);
near('an_huff_lens', IT.huffman(pa).len.map((l, i) => l).reduce((s, l, i) => s + pa[i] * l, 0), N.an_H);
near('mi_HXY', IT.H([0.4, 0.1, 0.1, 0.4], 2), N.mi_HXY); near('mi_kl_form', IT.KL([0.4, 0.1, 0.1, 0.4], [0.25, 0.25, 0.25, 0.25], 2), N.mi_kl_form);
near('dpi_IXZ', 1 - IT.H([0.18, 0.82], 2), N.dpi_IXZ);
// RNG and Monte Carlo: identical generator, so identical draws
near('rng_check', [r(IT.mulberry32(7)(), 10), r(IT.gauss(IT.mulberry32(7)), 10)], N.rng_check, 1e-10);
N.nce_rho.forEach((rho, i) => near('nce_est_rho' + rho, N.nce_N.map(n => r(IT.infonce(rho, n, 2048, 7), 4)), N.nce_est[i], 2e-4));
const pb = N.pb_N.map(n => IT.pluginSim(100, n, 200, 11));
near('pb_plugin', pb.map(v => r(v[0], 4)), N.pb_plugin, 2e-4); near('pb_mm', pb.map(v => r(v[1], 4)), N.pb_mm, 2e-4);
near('mib_est', N.mib_N.map(n => r(IT.miSim(10, n, 200, 13), 4)), N.mib_est, 2e-4);
// forward and reverse fits
const ft = IT.fit('fwd', 200), rt = IT.fit('rev', 200);
near('fit_fwd', ft[200].map(v => r(v, 3)), N.fit_fwd, 2e-3); near('fit_rev', rt[200].map(v => r(v, 3)), N.fit_rev, 2e-3);
N.fit_traj_steps.forEach((k, i) => { near('fit_fwd_traj' + k, ft[k].map(v => r(v, 3)), N.fit_fwd_traj[i], 2e-3); near('fit_rev_traj' + k, rt[k].map(v => r(v, 3)), N.fit_rev_traj[i], 2e-3); });
near('fit_fwd_KLs', IT.kls(...ft[200]).map(v => r(v, 3)), N.fit_fwd_KLs, 3e-3); near('fit_rev_KLs', IT.kls(...rt[200]).map(v => r(v, 3)), N.fit_rev_KLs, 3e-3);
near('valley_mass_fwd', IT.valley(...ft[200]), N.valley_mass_fwd, 1e-3);
// f-divergences (nats)
near('fdiv_KL', IT.KL(w, wq, Math.E), N.fdiv.KL); near('fdiv_revKL', IT.KL(wq, w, Math.E), N.fdiv.revKL);
near('fdiv_chi2', IT.chi2(w, wq), N.fdiv.chi2); near('fdiv_hell2', IT.hell2(w, wq), N.fdiv.hell2); near('fdiv_TV', IT.TV(w, wq), N.fdiv.TV); near('fdiv_JS', IT.JS(w, wq, Math.E), N.fdiv.JS);
// KL-regularised optimum
for (const [beta, v] of Object.entries(N.rl)) {
  const o = IT.rlopt([0.665, 0.245, 0.090].map((x, i) => p[i]), [0, 0, 1], +beta);
  near('rl_pi_' + beta, o.pi.map(x => r(x, 3)), v.pi, 1e-3); near('rl_KL_' + beta, o.KL, v.KL); near('rl_obj_' + beta, o.obj, v.obj); near('rl_betalogZ_' + beta, +beta * Math.log(o.Z), v.betalogZ);
}
console.log('check_js: ok', ok, 'mismatch', bad);
process.exit(bad ? 1 : 0);
