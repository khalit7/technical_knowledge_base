// Numbers quoted beside the Reading tab's slope figure (section "Sigmoid and tanh"): GPT-2 small's 3,072 recorded
// pre-activations of " cat" (layer 6) through each activation's derivative, as recorded and scaled by 3.
// usage: node src/slope_numbers.mjs   (reads parts/20_js_data.js and parts/21_js_core.js; same code as the page)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
globalThis.window = globalThis; globalThis.atob ??= s => Buffer.from(s, 'base64').toString('binary');
(0, eval)(fs.readFileSync(path.join(HERE, 'parts/20_js_data.js'), 'utf8'));
(0, eval)(fs.readFileSync(path.join(HERE, 'parts/21_js_core.js'), 'utf8'));
function dq(p) { const sc = p[0], b = atob(p[1]), n = b.length / 2, dv = new DataView(new ArrayBuffer(b.length));
  for (let i = 0; i < b.length; i++) dv.setUint8(i, b.charCodeAt(i)); const o = []; for (let i = 0; i < n; i++) o.push(dv.getInt16(2 * i, true) / 32767 * sc); return o }
const pre = dq(DATA.real.models.find(m => m.key === 'gpt2').tok.pre);
const out = { n: pre.length, negative: pre.filter(v => v < 0).length / pre.length, min: Math.min(...pre), max: Math.max(...pre), by: {} };
for (const k of [1, 3]) for (const id of ['sigmoid', 'tanh', 'relu', 'gelut', 'silu']) {
  const d = pre.map(x => AF.BY[id].d(k * x));
  out.by[id + ' x' + k] = { mean: +(d.reduce((a, b) => a + Math.abs(b), 0) / d.length).toFixed(3), zero: AF.BY[id].dead ? +(pre.filter(x => k * x <= 0).length / d.length).toFixed(3) : 0,
    below001: +(d.filter(v => Math.abs(v) < 0.01).length / d.length).toFixed(3), max: +Math.max(...d).toFixed(3) };
}
console.log(JSON.stringify(out, null, 1));
