// Compare the Reading visuals' JavaScript (parts/22_js_qviz.js) with visuals_ref.py's output (visuals_ref.json),
// and check that every number the prose quotes from them is in the built page.
// usage: ../../../../../.venv/bin/python3 visuals_ref.py && node check_visuals.mjs   (from this folder)
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {}, atob: s => Buffer.from(s, 'base64').toString('binary'), Math, Array, Float32Array, Uint16Array, Uint32Array, Uint8Array, Set, Error, Object, Number, String };
vm.createContext(ctx);
for (const f of ['21_js_qdata.js', '22_js_qcore.js', '22_js_qviz.js']) vm.runInContext(fs.readFileSync(path.join(here, 'parts', f), 'utf8'), ctx);
const QV = ctx.window.QV, ref = JSON.parse(fs.readFileSync(path.join(here, 'visuals_ref.json')));
let worst = 0, n = 0; const bad = [];
const cmp = (a, b, what) => { const d = Math.abs(a - b) / Math.max(1e-12, Math.abs(b)); n++; if (d > worst) worst = d; if (d > 1e-9) bad.push(`${what}: js ${a} py ${b}`) };
const h = QV.hero(); for (const k of Object.keys(ref.hero)) cmp(h[k], ref.hero[k], 'hero.' + k);
const r = QV.rot(); for (const m of ['plain', 'hadamard']) for (const k of ['xmax', 'med', 'ratio', 'a4', 'w4a4', 'a8', 'x4err']) cmp(r[m][k], ref.rot[m][k], `rot.${m}.${k}`);
if (r.hadamard.prodDiff > 1e-9) bad.push('rotation changed the product: ' + r.hadamard.prodDiff);
const g = QV.gptq(); for (const k of ['outRTN', 'outGPTQ', 'wRTN', 'wGPTQ']) cmp(g[k], ref.gptq[k], 'gptq.' + k);
g.Q.forEach((v, i) => cmp(v, ref.gptq.Q[i], 'gptq.Q' + i)); g.rtn.forEach((v, i) => cmp(v, ref.gptq.rtn[i], 'gptq.rtn' + i));
g.states.forEach((s, j) => s.cur.forEach((v, i) => cmp(v, ref.gptq.cur[j][i], `gptq.cur${j}.${i}`)));
// Fig. 2's five scopes and the migration (2026-11-10)
const sc = QV.scope(); sc.scopes.forEach(m => m.rows.forEach((r, i) => { const py = ref.scope[m.k][i]; if (py.row !== sc.rows[i].r) bad.push('scope row order');
  cmp(r.err, py.err, `scope.${m.k}.${py.row}.err`); if (r.zeros !== py.zeros) bad.push(`scope.${m.k}.${py.row}.zeros js ${r.zeros} py ${py.zeros}`) }));
for (const [name, v] of Object.entries(ref.mig)) { const m = QV.mig(name === 'sq50' ? 'sq' : name, v.alpha); for (const k of ['err', 'coarse', 'dx', 'xmax', 'wmax']) cmp(m[k], v[k], `mig.${name}.${k}`);
  if (m.prodDiff > 1e-12) bad.push('migration changed the product: ' + name + ' ' + m.prodDiff) }
// prose numbers, each formatted as the page prints it
const page = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8').replace(/<[^>]+>/g, ' ').replace(/&minus;/g, '−').replace(/\s+/g, ' ');
const pct = (x, d) => (100 * x).toFixed(d) + '%';
const pageT = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, '').replace(/&minus;/g, '−').replace(/\s+/g, ' ');
const want = [
  'the step is ' + h.tscale.toFixed(3), 'all ' + h.tzero + ' weights round to zero', 'a step of ' + h.bscale.toFixed(4) + ', ' + h.bzero + ' zeros and ' + pct(h.berr, 1) + ' error',
  'falls from ' + r.plain.ratio.toFixed(1) + ' to ' + r.hadamard.ratio.toFixed(1), 'from ' + pct(r.plain.a4, 1) + ' to ' + pct(r.hadamard.a4, 1), pct(r.plain.w4a4, 1) + ' to ' + pct(r.hadamard.w4a4, 1),
];
const wantT = ['the output error is ' + pct(g.outGPTQ, 1) + ' against ' + pct(g.outRTN, 1) + ', with a slightly higher weight error (' + pct(g.wGPTQ, 1) + ' against ' + pct(g.wRTN, 1) + ')',
  'all 802,816 weights sets one step for every weight: 1.664 / 7 = ' + h.tscale.toFixed(3)];
for (const w of wantT) if (!pageT.includes(w)) bad.push('prose missing: ' + w);
for (const w of want) if (!page.includes(w)) bad.push('prose missing: ' + w);
if (!page.includes((h.tscale / h.bamax).toFixed(1) + ' times this block')) bad.push('hero ratio missing: ' + (h.tscale / h.bamax).toFixed(2));
console.log(`compared ${n} values, worst relative difference ${worst.toExponential(2)}; prose numbers checked ${want.length + wantT.length}`);
console.log(bad.length ? bad.join('\n') : 'visuals OK'); process.exit(bad.length ? 1 : 0);
