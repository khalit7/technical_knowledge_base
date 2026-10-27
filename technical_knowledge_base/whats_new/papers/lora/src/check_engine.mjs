// Runs the page's JS engine (parts/22_js_lora.js) in node and writes model/engine_trace.json, which
// check_engine.py replays in PyTorch (float64): forward logits, LoRA training, rsLoRA training, full fine-tuning.
// usage (from src/): node check_engine.mjs && uv run --with torch --with numpy python check_engine.py
import fs from 'fs'; import vm from 'vm';
const ctx = { window: {}, Math, Float64Array, Int32Array, Uint8Array, Array, Object, JSON, console };
ctx.globalThis = ctx.window;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('parts/20_model_data.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('parts/22_js_lora.js', 'utf8'), ctx);
const E = ctx.window.LORA, D_ = ctx.window.LORA_DATA, base = E.loadBase(D_.base);
const TE = Object.fromEntries(Object.entries(D_.teachers).map(([k, v]) => [k, E.loadTeacher(v)]));
const arr = a => Array.from(a);
const out = { base: Object.fromEntries(Object.entries(base).map(([k, v]) => [k, arr(v)])) };
// 1. forward with a random LoRA on all six matrices
const R = E.rng(99); const lora = {};
for (const k of E.TARGETS) { const [o, i] = E.SHAPES[k]; const r = 3; const A = new Float64Array(r * i).map(() => R.gauss() * 0.3), B = new Float64Array(o * r).map(() => R.gauss() * 0.3); lora[k] = { A, B, r, s: 8 / r }; }
const data = E.gen(base, TE.v4, 200, E.rng(5), true);
const W = E.weights(base, lora); const logits = [];
for (let i = 0; i < data.n; i++) logits.push(arr(E.fwd(base, W, data.X, i).lg));
out.fwd = { X: arr(data.X), y: arr(data.y), changed: arr(data.changed), lora: Object.fromEntries(Object.entries(lora).map(([k, v]) => [k, { A: arr(v.A), B: arr(v.B), r: v.r, s: v.s }])), logits };
// merged against unmerged: identical predictions
let md = 0; const Ws = E.weightsSplit(base, lora); for (let i = 0; i < data.n; i++) { const a = E.fwd(base, Ws, data.X, i).lg; a.forEach((x, j) => md = Math.max(md, Math.abs(x - logits[i][j]))); }
out.mergeMaxDiff = md;
// 2. training traces
function trace(o) {
  const run = E.makeRun(base, Object.assign({ teach: TE[o.task] }, o)); const init = {}; if (run.lora) for (const k in run.lora) init[k] = arr(run.lora[k].A);
  const batches = [], losses = [];
  for (let s = 0; s < o.steps; s++) { const b = E.gen(base, TE[o.task], o.batch, run.dataR, false); batches.push({ X: arr(b.X), y: arr(b.y), p: arr(b.p) }); losses.push(E.trainStep(run, b)); }
  const fin = {}; if (run.lora) for (const k in run.lora) fin[k] = { A: arr(run.lora[k].A), B: arr(run.lora[k].B), s: run.lora[k].s }; else for (const k of ['Wq', 'E', 'W1']) fin[k] = arr(run.P[k]);
  return { o, init, batches, losses, fin };
}
out.traces = [
  trace({ method: 'lora', task: 'v4', targets: ['Wq', 'Wv'], r: 4, alpha: 8, scaling: 'r', lr: 3e-2, steps: 30, batch: 16, seed: 5 }),
  trace({ method: 'lora', task: 'mlp4', targets: ['Wq', 'Wk', 'Wv', 'Wo', 'W1', 'W2'], r: 2, alpha: 8, scaling: 'sqrt', lr: 1e-2, steps: 20, batch: 16, seed: 6 }),
  trace({ method: 'ft', task: 'v1', targets: [], r: 0, lr: 3e-3, steps: 15, batch: 16, seed: 7 }),
];
// 3. SVD and subspace similarity against numpy
const M = new Float64Array(8 * 32).map(() => R.gauss()); const s = E.svd(M, 8, 32);
out.svd = { M: arr(M), S: arr(s.S).slice(0, 8) };
out.teachers = Object.fromEntries(Object.entries(TE).map(([k, v]) => [k, { k: v.k, r: v.r, A: arr(v.A), B: arr(v.B) }]));
fs.writeFileSync('model/engine_trace.json', JSON.stringify(out));
console.log('trace written; merged vs unmerged max logit difference', md);
