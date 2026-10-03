// Run the page's InfoNCE maths (CSI in parts/30_js_batch.js) on the page's data (parts/20_js_data.js) and write
// check/js_out.json for recompute.py to compare against PyTorch. usage: node check_core.mjs
import fs from 'fs';
globalThis.window = globalThis;
eval(fs.readFileSync('parts/20_js_data.js', 'utf8'));
const src = fs.readFileSync('parts/30_js_batch.js', 'utf8'); eval(src.slice(0, src.indexOf('(function(){\n  const card')));
const D = CSD.rb, N0 = D.s1.length, out = { loss: [], grad: [], share: [] };
for (const m of ['bert', 'simcse']) for (const n of [2, 16, 48]) for (const t of [0.01, 0.05, 0.1, 0.5, 1]) for (const sym of [false, true]) {
  const r = CSI.loss(D.M[m], N0, n, t, sym); out.loss.push({ m, n, t, sym, L: r.L, acc: r.acc });
}
for (const m of ['bert', 'simcse']) for (const t of [0.05, 1]) {
  out.grad.push({ m, t, i: 30, g: CSI.grad(D.M[m], N0, 48, t, 30) });
  let sh = 0; for (let i = 0; i < 48; i++) { const g = CSI.grad(D.M[m], N0, 48, t, i); let ns = 0, mx = 0; g.forEach((v, j) => { if (j !== i) { ns += v; mx = Math.max(mx, v) } }); sh += mx / ns }
  out.share.push({ m, t, mean_top1_share: sh / 48 });
}
fs.writeFileSync('check/js_out.json', JSON.stringify(out));
console.log('wrote', out.loss.length, 'losses');
