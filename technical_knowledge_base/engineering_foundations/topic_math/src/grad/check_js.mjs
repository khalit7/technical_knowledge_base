// Runs the page's Gradient lab maths (parts/32_js_grad_core.js) and compares it with expected.json from recompute.py.
// usage: node check_js.mjs   (from src/grad/)
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '../parts/32_js_grad_core.js'), 'utf8');
const mod = {exports: {}};
new Function('module', src)(mod);
const G = mod.exports;
const E = JSON.parse(fs.readFileSync(path.join(here, 'expected.json'), 'utf8'));
let bad = 0, n = 0;
const flat = v => Array.isArray(v) ? v.flat(3) : [v];
function cmp(name, js, py, tol = 1e-12) {
  const a = flat(js), b = flat(py); n++;
  const ok = a.length === b.length && a.every((v, i) => (b[i] === null ? !isFinite(v) || Number.isNaN(v) : Math.abs(v - b[i]) <= tol * Math.max(1, Math.abs(b[i]))));
  if (!ok) { bad++; console.log('FAIL', name, JSON.stringify(a), JSON.stringify(b)); }
}
const z = [2, 1, 0];
cmp('ce p', G.softmax(z), E.ce_default.p);
cmp('ce L', G.LOSS.ce.L(z, {t: 2}), E.ce_default.L);
cmp('ce grad', G.LOSS.ce.g(z, {t: 2}), E.ce_default.grad);
cmp('ls L', G.LOSS.ls.L(z, {t: 2, eps: 0.1}), E.ls_default.L);
cmp('ls grad', G.LOSS.ls.g(z, {t: 2, eps: 0.1}), E.ls_default.grad);
cmp('focal L', G.LOSS.focal.L(z, {t: 2, gamma: 2}), E.focal_default.L);
cmp('focal grad', G.LOSS.focal.g(z, {t: 2, gamma: 2}), E.focal_default.grad);
cmp('focal numgrad', G.numgrad(v => G.LOSS.focal.L(v, {t: 2, gamma: 2}), z, 1e-5), E.focal_default.grad, 1e-9);
cmp('bce L', G.LOSS.bce.L([2], {y: 1}), E.bce_default.L);
cmp('bce grad', G.LOSS.bce.g([2], {y: 1}), E.bce_default.grad);
cmp('mse half', [G.LOSS.mse.L([1.5], {y: 1, half: true}), G.LOSS.mse.g([1.5], {y: 1, half: true})[0]], [E.mse_default.L_half, E.mse_default.grad_half]);
cmp('mse plain', [G.LOSS.mse.L([1.5], {y: 1, half: false}), G.LOSS.mse.g([1.5], {y: 1, half: false})[0]], [E.mse_default.L_plain, E.mse_default.grad_plain]);
// finite-difference error curve
const fdj = E.fd_err_dz2.h.map(h => Math.abs(G.numgrad(v => G.LOSS.ce.L(v, {t: 2}), z, h)[1] - G.softmax(z)[1]));
cmp('fd error curve (same order)', fdj.map(v => Math.log10(v + 1e-300)), E.fd_err_dz2.err.map(v => Math.log10(v + 1e-300)), 0.35);
// two-layer
const m = G.clone(G.M0), b = G.backward(m);
for (const k of ['a', 'h', 'z', 'p']) cmp('two ' + k, b.f[k], E.two[k]);
cmp('two L', b.f.L, E.two.L);
for (const k of ['dz', 'dW2', 'dh', 'da', 'dW1', 'dx']) cmp('two ' + k, b[k], E.two[k]);
cmp('two step', G.forward(G.sgdStep(m, G.LR)).L, E.two_step.L_after);
let mm = G.clone(G.M0); const ok = [G.forward(mm).L]; for (let i = 0; i < 5; i++) { mm = G.sgdStep(mm, G.LR); ok.push(G.forward(mm).L); }
cmp('traj ok', ok, E.traj.ok, 1e-9);
mm = G.clone(G.M0); const sg = [G.forward(mm).L]; for (let i = 0; i < 5; i++) { mm = G.sgdStep(mm, G.LR, '', 1); sg.push(G.forward(mm).L); }
cmp('traj sign', sg, E.traj.sign, 1e-9);
const bt = G.backward(m, 'transpose');
cmp('bug transpose dW1', bt.dW1, E.bug_transpose.dW1);
cmp('bug transpose dx', bt.dx, E.bug_transpose.dx);
cmp('bug twice L', G.lossTwice(m), E.bug_twice.L);
cmp('bug twice dz', G.backward(m, 'twice').dz, E.bug_twice.dz);
const mc = G.macs(m, true), mf = G.macs(m, false);
cmp('macs', [mc.fwd, mc.bwd, mf.bwd], [E.macs.fwd, E.macs.bwd_trainx, E.macs.bwd_fixedx]);
const gc = G.gradCheck(m, '');
cmp('grad check max diff < 1e-9', [Math.max(...gc.map(r => r.diff)) < 1e-9 ? 1 : 0], [1]);
// Bernoulli
for (const e of E.bern) { const r = G.bern(e.z); cmp('bern z=' + e.z.toFixed(3), [r.p, r.H0, r.H1, r.vr, r.fish], [e.p, e.hess_y0, e.hess_y1, e.var, e.fisher], 1e-6); }
// overflow
cmp('naive softmax', G.softmaxNaive([1000, 999, 0]), E.overflow.naive);
cmp('stable softmax', G.softmax([1000, 999, 0]), E.overflow.stable);
cmp('lse', G.lse([1000, 999, 0]), E.overflow.lse);
// curvature: GD verdict agrees with simulation on a grid
let vbad = 0;
for (const r of [0.3, 0.9, 1.2, 1.9, 2.1, 3]) {
  const o = {opt: 'gd', l1: 4, l2: 4 / 25, ang: 0.5, lr: r / 4, steps: 3000, start: [3, 2]};
  const run = G.runOpt(o), last = run.loss[run.loss.length - 1], v = G.verdict(o);
  const conv = last < 1e-6; if (conv !== (v !== 'diverges')) vbad++;
}
for (const r of [3.6, 3.75, 3.9]) {
  const o = {opt: 'mom', beta: 0.9, l1: 4, l2: 1, ang: 0, lr: r / 4, steps: 6000, start: [3, 2]};
  const run = G.runOpt(o), last = run.loss[run.loss.length - 1];
  if ((last < 1e-6) !== (G.verdict(o) === 'converges')) vbad++;
}
cmp('verdicts match simulation', [vbad], [0]);
const nw = G.runOpt({opt: 'newton', l1: 5, l2: 0.2, ang: 0.7, lr: 1, steps: 1, start: [3, 2]});
cmp('newton one step to 0', nw.path[1], [0, 0], 1e-12);
let dm = G.clone(G.M0); for (let i = 0; i < 5; i++) dm = G.sgdStep(dm, G.LR, 'detach');
cmp('detach 5 steps', G.forward(dm).L, E.detach_5, 1e-9);
const b1 = G.backward(G.M1);
cmp('one z', b1.f.z, E.one.z); cmp('one L', b1.f.L, E.one.L); cmp('one dW', b1.dW, E.one.dW); cmp('one dx', b1.dx, E.one.dx);
for (const k of Object.keys(E.one.steps)) { const f = G.forward(G.sgdStep(G.M1, +k, '', -1, true)); cmp('one step ' + k, [f.z, f.p, f.L], [E.one.steps[k].z, E.one.steps[k].p, E.one.steps[k].L], 1e-9); }
cmp('one grad check', [Math.max(...G.gradCheck(G.M1, '').map(r => r.diff)) < 1e-9 ? 1 : 0], [1]);
console.log(bad ? `${bad} of ${n} FAILED` : `ALL ${n} MATCH`);
process.exit(bad ? 1 : 0);
