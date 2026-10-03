// Compare the page's JS quantisers (parts/22_js_qcore.js) with qformats.py on the shipped rows (quant_check_ref.json in the temp folder).
// usage: node check_js.mjs   (after: uv run --with numpy python check_ref.py)
import fs from 'node:fs'; import os from 'node:os'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {}, atob: s => Buffer.from(s, 'base64').toString('binary'), Math, Array, Float32Array, Uint16Array, Uint32Array, Uint8Array, Set, Error };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, 'parts/21_js_qdata.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(here, 'parts/22_js_qcore.js'), 'utf8'), ctx);
const QF = ctx.window.QF, D = ctx.window.QD, ref = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), 'quant_check_ref.json')));
const R = QF.bf16(D.rows_bf16), K = D.K; let worst = 0, n = 0;
for (const kind of ['int4', 'nf4', 'mxfp4', 'mxfp8', 'nvfp4', 'e4m3']) {
  const g = kind === 'nvfp4' ? 16 : 32;
  D.rows.forEach((_, ri) => { const row = R.slice(ri * K, (ri + 1) * K); const q = [];
    for (let b = 0; b < K / g; b++) q.push(...QF.qgroup(row.slice(b * g, b * g + g), kind, { tensorAmax: D.w_absmax }).q);
    q.forEach((v, i) => { worst = Math.max(worst, Math.abs(v - ref[kind][ri][i])); n++ }) });
}
for (const f of Object.keys(ref.round)) ref.xs.forEach((x, i) => { worst = Math.max(worst, Math.abs(QF.rf(x, f) - ref.round[f][i]) / Math.max(1e-30, Math.abs(ref.round[f][i]) || 1)); n++ });
console.log(`compared ${n} values, worst difference ${worst}`); process.exit(worst < 1e-9 ? 0 : 1);
