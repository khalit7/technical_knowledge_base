// Export a case for check_engine.py: the toy's initial weights, 60 batches, an LR schedule (warmup, flat, decay), and what the
// JS engine (parts/22_js_toy.js) computed: per-step training loss, final weights, held-out excess loss, and a merge.
// usage: node check_engine.mjs && uv run --with torch python check_engine.py  ->  model/check_engine.json
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); const T = createRequire(import.meta.url)(path.join(here, 'parts/22_js_toy.js'));
const seed = 3, B = 16, N = 60, lr = s => s < 10 ? 5e-3 * (s + 1) / 10 : s < 40 ? 5e-3 : 5e-3 * (1 - Math.sqrt((s - 39) / 20));
const st = { p: T.initParams(seed), opt: T.makeOpt() }, p0 = Array.from(st.p), batches = [], losses = [], cks = [];
const g = new Float64Array(T.NP);
for (let s = 0; s < N; s++) { const [xs, ys] = T.task().batch(seed, s, B); batches.push({ xs: xs.map(x => Array.from(x)), ys }); losses.push(T.gradBatch(st.p, xs, ys, g)); T.adamStep(st.p, g, st.opt, lr(s)); if ((s + 1) % 20 === 0) cks.push(Array.from(st.p)); }
const c = T.mergeWeights('1-sqrt', 3), mg = T.merge(cks.map(a => Float64Array.from(a)), c);
fs.writeFileSync(path.join(here, 'model/engine_case.json'), JSON.stringify({ D: T.D, H: T.H, K: T.K, B, lrs: Array.from({ length: N }, (_, s) => lr(s)), p0, batches, losses, pN: Array.from(st.p), mergeC: c, merged: Array.from(mg), excessFinal: T.task().excess(st.p) }));
console.log('wrote model/engine_case.json');
