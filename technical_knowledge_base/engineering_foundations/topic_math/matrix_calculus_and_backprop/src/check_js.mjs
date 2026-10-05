// Run the page's maths (parts/22b_js_core.js) and compare with expected.json (from recompute.py).
// usage: node src/check_js.mjs     exits 1 on any mismatch
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const H = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {}, Math, JSON, Array, Set, Object, Number, String }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(H, 'parts/22b_js_core.js'), 'utf8'), ctx);
const M = ctx.window.MC, E = JSON.parse(fs.readFileSync(path.join(H, 'expected.json'), 'utf8'));
let n = 0, bad = 0;
const flat = a => Array.isArray(a) ? a.flat(3) : [a];
function cmp(name, a, b, tol = 1e-9) { n++; const x = flat(a), y = flat(b);
  const err = x.length !== y.length ? Infinity : Math.max(0, ...x.map((v, i) => Math.abs(v - y[i])));
  if (!(err <= tol)) { bad++; console.log('MISMATCH', name, err); } }
const t = M.tinyAll(), T = E.tiny;
for (const k of ['z', 'p', 'gz', 'gW', 'gx', 'J']) cmp('tiny ' + k, t[k], T[k]);
cmp('tiny loss', t.loss, T.loss);
M.tinyJvps().forEach((r, i) => cmp('jvp ' + i, r.dL, T.jvps[i].dL));
for (const [name, d] of Object.entries(E.wb)) {
  if (name === 'rmsnorm') continue;
  const cases = name === 'act' ? Object.values(d) : [d];
  for (const c of cases) {
    const P = JSON.parse(JSON.stringify(c.P)), L = M.L[name];
    cmp(name + ' fwd', L.fwd(P), c.out, 1e-12);
    const g = L.bwd(P, c.g);
    for (const k of L.inputs) cmp(name + ' grad ' + k + (P.fn ? ' ' + P.fn : ''), g[k], c.grads[k], 1e-12);
    const fd = M.fdCheck(name, P, c.g, 1e-5); n++; if (!(fd.worst < 1e-6)) { bad++; console.log('FD', name, fd.worst); }
  }
}
const ln = E.wb.layernorm, kf = M.L.layernorm.kernel(ln.P, ln.g);
cmp('ln kernel a b c', [kf.a, kf.b, kf.c], [ln.kernel.a, ln.kernel.b, ln.kernel.c], 1e-12); cmp('ln kernel dx', kf.x, ln.grads.x, 1e-12);
const at = M.L.attn.bwd(E.wb.attn.P, E.wb.attn.g); cmp('attn D', at.D, E.wb.attn.D, 1e-12); cmp('attn dS', at.dS, E.wb.attn.dS, 1e-12);
const cv = M.chainVals(9); cmp('chain h', cv.h, E.chain9.h); cmp('chain gw', cv.gw, E.chain9.gw); cmp('chain loss', cv.loss, E.chain9.loss);
for (const [key, v] of Object.entries(E.schedules)) { const [nn, mode, seg] = key.split('_'); const r = M.chainSchedule(+nn, mode, +seg);
  cmp('schedule ' + key, [r.peak, r.fw, r.rc, r.bw], [v.peak, v.fw, v.rc, v.bw], 0); }
const ec = M.einsumCost('bhqd,bhkd->bhqk', { b: 2, h: 8, q: 128, k: 128, d: 64 }); cmp('einsum attn', [ec.macs, ec.flops], [E.einsum_attn.macs, E.einsum_attn.flops], 0);
console.log('check_js:', n, 'checks,', bad, 'mismatches');
process.exit(bad ? 1 : 0);
