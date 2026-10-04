// Compare the page's JavaScript (ring, clocks, history checker) with recompute_out.json from recompute.py.
// Run from this folder: python3 recompute.py && node check_recompute.mjs
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
const R = JSON.parse(fs.readFileSync(path.join(H, 'recompute_out.json'), 'utf8'));
const ctx = { window: {}, Math, Uint32Array, Int16Array, Array, Set, Object, Error, Infinity, console, document: { getElementById: () => null } };
ctx.RD = { onRender() {}, onResize() {}, width: () => 400, svg: () => '', t: () => '' }; vm.createContext(ctx);
for (const f of ['25_js_ring.js', '27_js_clocks.js', '32_js_hist.js']) vm.runInContext(fs.readFileSync(path.join(H, 'parts', f), 'utf8'), ctx);
let bad = 0, n = 0;
const eq = (a, b, w) => { n++; if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.log('MISMATCH', w, JSON.stringify(a), JSON.stringify(b)) } };
const ring = ctx.window.DSF_RING;
for (const k in R.ring) { const [mode, n1, v] = k.split('_'); const o = ring.run(mode, +n1, +v), r = R.ring[k];
  eq(o.before, r.before, k + ' before'); eq(o.after, r.after, k + ' after'); eq(o.moved, r.moved, k + ' moved'); if (Math.abs(o.imb - r.imb) > 1e-12) { bad++; console.log('MISMATCH imb', k) } }
const C = ctx.window.DSF_CLK;
eq(JSON.parse(JSON.stringify(C.P)), R.defs.P, 'clock processes'); eq(JSON.parse(JSON.stringify(C.MSG)), R.defs.MSG, 'clock messages');
for (const e in R.clocks.lamport) { eq(C.C.L[e], R.clocks.lamport[e], 'lamport ' + e); eq(Array.from(C.C.V[e]), R.clocks.vector[e], 'vector ' + e) }
const Hs = ctx.window.DSF_H;
for (const h of R.defs.HIST) { const j = Hs.HIST.find(x => x.id === h.id);
  eq(j.ops.map(o => ({ p: o.p, s: o.s, e: o.e, f: o.f, v: o.v })), h.ops, 'history ' + h.id);
  eq(!!Hs.check(j.ops, true), R.hist[h.id].lin, 'lin ' + h.id); eq(!!Hs.check(j.ops, false), R.hist[h.id].seq, 'seq ' + h.id) }
if (R.measured_table_mismatches.length) { bad++; console.log('measured table', R.measured_table_mismatches) }
console.log(`checks=${n} mismatches=${bad}`); process.exit(bad ? 1 : 0);
