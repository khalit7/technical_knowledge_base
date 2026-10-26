// Runs the page's maths (parts/22_js_core.js) in Node and compares it with recompute.py (inputs/numbers.json).
// (The two-moons sampler checks moved with the networks to Diffusion from zero, src/runs/check_moons.mjs, 2026-10-26.)
// Usage: node src/check_js.mjs   (from anywhere)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const H = path.dirname(fileURLToPath(import.meta.url));
globalThis.window = globalThis; globalThis.atob = s => Buffer.from(s, 'base64').toString('latin1');
eval(fs.readFileSync(path.join(H, 'parts/22_js_core.js'), 'utf8'));
const N = JSON.parse(fs.readFileSync(path.join(H, 'inputs/numbers.json')));
let ok = 0, bad = 0;
const cmp = (name, js, py, tol) => { const d = Math.abs(js - py); if (d <= (tol || 1e-4)) ok++; else { bad++; console.log('MISMATCH', name, js, py) } };
// model A
const A = VI.modelA(1.5, 0.25, 0.5, 0.25);
cmp('logpx', A.logpx, N.A.logpx); cmp('elbo', A.elbo, N.A.q.elbo); cmp('gap', A.gap, N.A.q.kl_post); cmp('e_lik', A.eLik, N.A.q.e_lik);
cmp('e_prior', A.ePri, N.A.q.e_prior); cmp('entropy', A.ent, N.A.q.entropy); cmp('kl_prior', A.klPrior, N.A.q.kl_prior); cmp('post_m', A.pm, N.A.post_m); cmp('post_v', A.pv, N.A.post_v);
const Ap = VI.modelA(1.5, 0.25, A.pm, A.pv); cmp('elbo at posterior', Ap.elbo, N.A.at_post.elbo);
// model B
const B = VI.modelB(2, 0.25, N.B.best_m, N.B.best_sd ** 2);
cmp('B logpx', B.logpx, N.B.logpx, 2e-4); cmp('B best elbo', B.elbo, N.B.best_elbo, 2e-4); cmp('B gap', B.gap, N.B.best_gap, 3e-4);
// Gaussian KL
cmp('kl diag', VI.klStd(N.kl.ex.mu, N.kl.ex.sig), N.kl.closed); cmp('kl dim1', VI.klStd([1], [0.5]), N.kl.dim1);
// CAVI
const C = VI.cavi(N.cavi.data, 0, 1, 1, 1, 12), h = C.h[C.h.length - 1];
cmp('cavi lamN', h.lamN, N.cavi.hist[11][1]); cmp('cavi bN', h.bN, N.cavi.hist[11][2]); cmp('cavi Et', h.Et, N.cavi.hist[11][3]);
cmp('cavi round1 lamN', C.h[0].lamN, N.cavi.hist[0][1]); cmp('cavi round1 bN', C.h[0].bN, N.cavi.hist[0][2]);
cmp('exact var mu', C.exact.varMu, N.cavi.exact_var_mu, 1e-5); cmp('mf var mu', 1 / h.lamN, N.cavi.mf_var_mu, 1e-5); cmp('exact var tau', C.exact.varT, N.cavi.exact_var_tau);
// schedules
for (const t of ['1', '100', '200', '500', '1000']) cmp('lin abar ' + t, VI.abar('linear', +t), N.sched.lin[t], 1e-6);
for (const t of ['1', '200', '500', '999']) cmp('cos abar ' + t, VI.abar('cosine', +t), N.sched.cos[t], 1e-6);
cmp('root abar200', VI.abar('linear', 200), N.root.abar200);
console.log('check_js: ok', ok, 'mismatches', bad); process.exit(bad ? 1 : 0);
