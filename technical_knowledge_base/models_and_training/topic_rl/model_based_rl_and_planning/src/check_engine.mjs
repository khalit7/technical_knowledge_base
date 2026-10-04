// Runs the page's engine (parts/20_js_mb_data.js + parts/21_js_mb_engine.js) in Node and compares every value
// with expected.json written by recompute.py (the independent Python reference). Run from src/: node check_engine.mjs
import fs from 'fs';
globalThis.window = globalThis; globalThis.atob = s => Buffer.from(s, 'base64').toString('binary');
eval(fs.readFileSync('parts/20_js_mb_data.js', 'utf8'));
eval(fs.readFileSync('parts/21_js_mb_engine.js', 'utf8'));
const E = JSON.parse(fs.readFileSync('expected.json', 'utf8')), MB = globalThis.MB, D = globalThis.MB_DATA;
let n = 0, bad = 0, maxd = 0;
function cmp(name, a, b, tol) {
  tol = tol == null ? 1e-9 : tol;
  if (Array.isArray(b)) { if (!Array.isArray(a) || a.length !== b.length) { bad++; console.log('LEN', name, a && a.length, b.length); return } b.forEach((x, i) => cmp(name + '[' + i + ']', a[i], x, tol)); return }
  if (b !== null && typeof b === 'object') { for (const k of Object.keys(b)) cmp(name + '.' + k, a[k], b[k], tol); return }
  n++;
  if (typeof b === 'number') { const d = Math.abs(a - b) / Math.max(1, Math.abs(b)); if (d > maxd) maxd = d; if (!(d <= tol)) { bad++; if (bad < 20) console.log('DIFF', name, a, b) } }
  else if (a !== b) { bad++; if (bad < 20) console.log('DIFF', name, a, b) }
}
const DY = { alpha: 0.1, eps: 0.1, gamma: 0.95 };
const cur = MB.dynaCurves([0, 5, 50], 30, 50, DY);
for (const k of ['0', '5', '50']) cmp('dyna_curves.' + k, cur[k].mean.map(x => Math.round(x * 1e6) / 1e6), E.dyna_curves[k], 1e-9);
for (const k of ['0', '5', '50']) { const s = MB.dynaSnapshot(+k, 0, DY), e = E.dyna_snap[k]; cmp('snap' + k, { lens: s.lens, half: s.half, pos: s.pos, policy: s.policy, arrows: s.arrows }, e) }
for (const [name, steps, sw] of [['block', 3000, 1000], ['short', 6000, 3000]]) for (const plus of [false, true]) {
  const c = MB.changingMaze(name, plus, steps, sw, 50, 1.0, 0.1, 0.95, plus ? 1e-3 : 0, 20), key = name + (plus ? '_plus' : '');
  const s = []; for (let t = 99; t < steps; t += 100) s.push(Math.round(c[t] * 1e6) / 1e6); cmp('changing.' + key, s, E.changing[key]) }
// tic-tac-toe
MB.solve([0, 0, 0, 0, 0, 0, 0, 0, 0]);
cmp('solved show', MB.solved(E.show.board), E.show.solved);
const nets = {}; for (const k of Object.keys(D.ttt.ckpts)) nets[k] = MB.Net(D.ttt.ckpts[k]);
const tr = t => t.map(x => ({ path: x.path, v: x.v, N: x.N, ...(x.kind ? { kind: x.kind } : { roll: x.roll }) }));
for (const k of ['60', '0']) { const r = MB.puct(nets[k], E.show.board, 30, true); cmp('puct' + k, { N: r.N, Q: r.Q, P: r.P, v0: r.v0, trace: tr(r.trace) }, E.show['puct' + k]) }
{ const r = MB.uct(E.show.board, 30, MB.rng(4242), true); cmp('uct', { N: r.N, Q: r.Q, trace: tr(r.trace) }, E.show.uct) }
const SIMS = E.reliability.sims, ru = SIMS.map(s => { let c = 0; for (let i = 0; i < 40; i++) c += MB.top(MB.uct(E.show.board, s, MB.rng(7000 + i)).N) === 5; return c / 40 });
cmp('reliability.uct', ru, E.reliability.uct);
for (const k of ['0', '1', '60']) cmp('reliability.puct' + k, SIMS.map(s => MB.top(MB.puct(nets[k], E.show.board, s).N) === 5 ? 1 : 0), E.reliability.puct[k]);
// network accuracy over every non-terminal position (prior's top move optimal; mean |v - exact value|)
for (const k of Object.keys(nets)) { let acc = 0, mae = 0, cnt = 0;
  for (const [key, [vs, opt]] of MB.allSolved()) { if (!opt.length) continue; const b = key.split(',').map(Number), [p, v] = nets[k].evaluate(b);
    let a = -1, bp = -2; for (let i = 0; i < 9; i++) if (b[i] === 0 && p[i] > bp) { bp = p[i]; a = i } acc += opt.includes(a); mae += Math.abs(v - vs); cnt++ }
  cmp('ttt.' + k, { prior_opt: acc / cnt, v_mae: mae / cnt }, { prior_opt: E.ttt[k].prior_opt, v_mae: E.ttt[k].v_mae }) }
// pendulum
const mem = D.pend.members.map(w => MB.PMember(w, D.pend.out_scale)), tests = MB.pendTests();
for (const [k, key] of [[0, 'open'], [5, 'branch5']]) cmp('pend.' + key, MB.pendErrorCurves(mem, tests, k), E.pend[key], 1e-7);
for (const [k, key] of [[0, 'ex_open'], [5, 'ex_k5']]) { const r = MB.pendRollout(mem[0], ...tests[5], k); cmp('pend.' + key, { T: r.T, M: r.M }, E.pend[key], 1e-7) }
console.log('values compared', n, 'mismatches', bad, 'largest relative difference', maxd.toExponential(2));
process.exit(bad ? 1 : 0);
