// Runs the page's engine (parts/21_js_engine.js) in Node and compares it with inputs/recompute.json from recompute.py.
// Usage, from src/: python3 recompute.py && node check_engine.mjs
import fs from 'fs';
eval(fs.readFileSync(new URL('./parts/21_js_engine.js', import.meta.url), 'utf8'));
const E = globalThis.LLE, R = JSON.parse(fs.readFileSync(new URL('./inputs/recompute.json', import.meta.url)));
let bad = 0, n = 0;
const eq = (a, b, k, tol = 1e-9) => { n++; if (Math.abs(a - b) > tol) { bad++; console.log('MISMATCH', k, a, b) } };
const g4 = E.groupAdv([1, 0, 0, 0], 'grpo');
eq(g4.m, R.ex4.mean, 'ex4.mean'); eq(g4.sd, R.ex4.std, 'ex4.std'); eq(g4.A[0], R.ex4.A_pos, 'A_pos'); eq(g4.A[1], R.ex4.A_neg, 'A_neg');
eq(E.ppoL(1.3, g4.A[0], 0.2, 0.2), R.clip_pos.taken, 'clip_pos'); eq(E.ppoL(1.3, g4.A[1], 0.2, 0.2), R.clip_neg.taken, 'clip_neg');
eq(E.k3(0.5), R.k3_half, 'k3');
const w = E.tokenWeights(g4.A, [100, 1000, 100, 100], 'grpo').map(x => x * 4);
eq(w[1], R.len_bias.w1000, 'len1000'); eq(w[2], R.len_bias.w100, 'len100');
const g1 = E.groupAdv([1].concat(new Array(15).fill(0)), 'grpo'), g8 = E.groupAdv([1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0], 'grpo');
eq(g1.A[0], R.diff_bias.A1, 'diff1'); eq(g8.A[0], R.diff_bias.A8, 'diff8'); eq(g1.sd, R.diff_bias.std1, 'std1');
eq(E.groupAdv([1].concat(new Array(15).fill(0)), 'drgrpo').A[0], R.drgrpo.A1, 'dr1');
const rl = E.groupAdv([1, 0, 0, 0], 'rloo'); eq(rl.A[0], R.rloo_ex4.pos, 'rloo+'); eq(rl.A[1], R.rloo_ex4.neg, 'rloo-');
for (const y of Object.keys(R.overlong)) eq(E.overlong(+y), R.overlong[y], 'overlong ' + y);
eq(E.gspo([Math.log(1.1), Math.log(0.9), 0]), R.gspo3.s, 'gspo');
eq(E.tis(0.25 / 0.2, 2), R.tis.a, 'tis a'); eq(E.tis(0.25 / 0.05, 2), R.tis.b, 'tis b');
for (const m of ['ppo', 'dapo', 'cispo', 'none']) { const h = E.rareToken(0.01, m, 0.05, 16); eq(h[16].p, R.rare[m].p, 'rare ' + m); eq(h.slice(0, 16).filter(x => x.active).length, R.rare[m].active, 'rare active ' + m) }
const B = E.pkProblems();
eq(E.pkCurve(B, [1])[0], R.passk.base[0], 'pk base 1'); eq(E.pkCurve(B, [1024])[0], R.passk.base[1], 'pk base 1024');
eq(E.pkCurve(B.map(E.pkSharpen), [1024])[0], R.passk.sharp[1], 'pk sharp'); eq(E.pkCurve(B.map(E.pkExpand), [1024])[0], R.passk.expand[1], 'pk expand');
E.gae([0, 0, 0, 1], [0.2, 0.4, 0.5, 0.7], 1, 1).forEach((a, i) => eq(a, R.gae_toy.lam1[i], 'gae1 ' + i));
E.gae([0, 0, 0, 1], [0.2, 0.4, 0.5, 0.7], 1, 0.95).forEach((a, i) => eq(a, R.gae_toy.lam095[i], 'gae.95 ' + i));
console.log(bad ? 'FAIL' : 'PASS', n, 'checks,', bad, 'mismatches');
process.exit(bad ? 1 : 0);
