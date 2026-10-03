// Runs the page's own core maths (parts/21_js_core.js) on the page's data in Node and writes check/js_out.json,
// which recompute.py compares with scikit-learn. Run: node check_core.mjs
import fs from 'fs';
globalThis.atob = s => Buffer.from(s, 'base64').toString('binary');
for (const f of ['parts/20_js_diab.js', 'parts/21_js_core.js', 'parts/30_js_digits.js']) { const src = fs.readFileSync(f, 'utf8').replace(/window\./g, 'globalThis.'); (0, eval)(src); }
const RG = globalThis.RG, D = RG.parse(globalThis.DIAB.raw), N = D.y.length, all = [...Array(N).keys()];
const z = RG.stdz(D.X, D.y, all), S = RG.stats(z.f(all), z.g(all));
const out = {};
out.ols = RG.ols(S); out.knots = RG.lassoPath(S).map(k => ({ lam: k.lam, b: k.b, ev: k.ev }));
const lams = [0.01, 0.1, 0.5, 1, 2, 5, 10, 20];
out.lams = lams;
out.ridge = lams.map(l => RG.ridge(S, l));
out.lasso_cd = lams.map(l => RG.enet(S, l, 1));
out.lasso_path = lams.map(l => RG.pathAt(RG.lassoPath(S), l));
out.enet5 = lams.map(l => RG.enet(S, l, 0.5));
out.enet2 = lams.map(l => RG.enet(S, l, 0.2));
// two-feature subproblems used by the geometry panel
out.sub = {};
for (const [k, ix] of Object.entries({ bmi_ltg: [2, 8], s1_s2: [4, 5] })) {
  const s2 = RG.sub(S, ix); out.sub[k] = { ols: RG.ols(s2), knots: RG.lassoPath(s2), ridge: lams.map(l => RG.ridge(s2, l)), enet5: lams.map(l => RG.enet(s2, l, 0.5)) };
}
// early stopping: gradient descent from zero
const eta = 1.9 * N / RG.lmax(S.G); out.gd_eta = eta; const gd = RG.gd(S, eta, 200); out.gd = [1, 5, 20, 100, 200].map(t => gd[t]);
// held-out error, splits by the seeded generator
out.splits = [];
for (const [m, seed] of [[50, 1], [50, 2], [100, 7]]) {
  const sp = RG.split(N, m, seed), H = RG.heldout(D, sp);
  out.splits.push({ m, seed, tr: sp.tr.slice(0, 8), ridge: lams.map(l => RG.mse(H.T, RG.ridge(H.S, l))), lasso: lams.map(l => RG.mse(H.T, RG.enet(H.S, l, 1))), ols: RG.mse(H.T, RG.ols(H.S)) });
}

// the dropout network: weight-scaled predictions on all 360 test digits, and thinned networks with the seeded generator
const DIG = globalThis.DIG, L = RG.mlp(DIG.model), pix = k => [...DIG.digits.slice(k * 64, k * 64 + 64)].map(c => parseInt(c, 17) / 16);
out.ws_pred = [...Array(DIG.labels.length).keys()].map(d => { const p = RG.fwd(L, pix(d), [1, 1, 1]).p; return p.indexOf(Math.max(...p)) });
out.ws_probs0 = RG.fwd(L, pix(0), [1, 1, 1]).p;
const rr = RG.rng(1242); out.thin = [5, 17].map(d => RG.fwd(L, pix(d), DIG.model.keep, rr).p);
out.acts0 = RG.fwd(L, pix(DIG.measures.clear[0]), [1, 1, 1]).acts[0];
const r = RG.rng(42); out.rng = [r(), r(), r()];
fs.mkdirSync('check', { recursive: true });
fs.writeFileSync('check/js_out.json', JSON.stringify(out));
console.log('knots', out.knots.length, out.knots.map(k => k.ev).join(' '), 'lam0', out.knots[0].lam.toFixed(3));
