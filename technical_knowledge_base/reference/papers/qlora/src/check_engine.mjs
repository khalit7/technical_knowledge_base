// The browser engine (parts/22_js_engine.js) on the shipped data, against check_engine.py's Python reference.
// usage (from src/): uv run --with numpy python check_engine.py && node check_engine.mjs
import fs from 'node:fs'; import vm from 'node:vm';
const ctx = { atob: s => Buffer.from(s, 'base64').toString('binary'), Math, Float64Array, Float32Array, Int16Array, Uint8Array, Array, Object, JSON, console };
ctx.window = ctx; vm.createContext(ctx);
const src = f => fs.readFileSync('parts/' + f, 'utf8');
vm.runInContext(src('20_data.js'), ctx);
vm.runInContext('function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}', ctx);
vm.runInContext(src('22_js_engine.js'), ctx);
const QE = ctx.QE, QD = ctx.QD, ref = JSON.parse(fs.readFileSync('model/check_engine_ref.json'));
const res = { nf4_vs_appendixE: Math.max(...QE.nf4().map((v, i) => Math.abs(v - QD.appE[i]))) };
let qmax = 0, idxBad = 0;
for (const r of ref.quant) {
  const t = QD.w.find(x => x.name === r.tensor), x = Array.from(QE.decF16(t.w)), code = QD.types[r.type];
  const q = QE.quantise(x, code, r.B), st = QE.stats(x, q, code);
  qmax = Math.max(qmax, Math.abs(st.relmse - r.relmse) / r.relmse); let s = 0; q.idx.forEach(v => s += v); if (s !== r.idx_sum) idxBad++;
}
res.quant_rel_diff_max = qmax; res.quant_index_mismatches = idxBad; res.quant_cases = ref.quant.length;
res.dq = ref.dq.map(r => { const t = QD.w.find(x => x.name === r.tensor), am = QE.decF32(t.absmax), d = QE.dq(am, QD.dyn8, 256); let e = 0; am.forEach((v, i) => e += Math.abs(d.q[i] - v) / v); return Math.abs(e / am.length - r.mean_rel_err) });
const fixed = {};
for (const [key, judge, bench] of [['gpt4_vicuna', 'gpt4', 'vicuna'], ['gpt4_oa', 'gpt4', 'oa'], ['human_vicuna', 'human', 'vicuna']]) {
  // the same matches in the same order as Python (file order: pair by pair, prompt by prompt)
  let ms = QE.matches(judge, bench).slice().sort((x, y) => x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : x[0] - y[0]);
  const R = QE.eloPass(ms, ms.map((_, i) => i), 32), P = ref.elo_fixed[key];
  fixed[key] = { n_js: ms.length, n_py: P.n, max_diff: Math.max(...Object.keys(P.R).map(k => Math.abs(R[k] - P.R[k]))) };
}
res.elo_fixed_order = fixed;
let rmax = 0; for (const k in ref.relative) { const j = QE.relScore(k); for (const o of ['chatgpt_first', 'system_first']) if (ref.relative[k][o] != null) rmax = Math.max(rmax, Math.abs(j[o] - ref.relative[k][o])); if (ref.relative[k].mean_pooled != null) rmax = Math.max(rmax, Math.abs(j.pooled - ref.relative[k].mean_pooled)) }
res.relative_max_diff = rmax;
res.note_index = 'index sums can differ only where a weight sits exactly on the midpoint between two code values (float rounding of the midpoint); the error difference bounds the effect';
const ok = res.nf4_vs_appendixE < 1e-6 && qmax < 1e-6 && idxBad <= 2 && Math.max(...res.dq) < 1e-9 && Object.values(fixed).every(f => f.n_js === f.n_py && f.max_diff < 1e-6) && rmax < 1e-9;
res.verdict = ok ? 'PASS' : 'FAIL';
fs.writeFileSync('model/check_engine.json', JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
process.exit(ok ? 0 : 1);
