// Dump batches from the toy's own training loop (after 40 steps, so the policy is not at its start) with the JS
// advantages and gradients for every method, for check_engine.py to recompute with PyTorch autograd.
//   node check_engine.mjs && uv run --with torch python check_engine.py
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const here = new URL('.', import.meta.url).pathname;
const T = require(here + 'parts/22_js_toy.js');
const cases = [];
for (const st of ['budget', 'graded']) {
  const P = T.train({ setting: st, method: 'gdpo', seed: 3, steps: 40 }).P;
  const r = T.rng(99), B = T.bank, qs = [], acts = [], Rc = [], Rl = [];
  const sample = p => { let u = r(), c = 0; for (let x = 0; x < p.length; x++) { c += p[x]; if (u < c) return x; } return p.length - 1; };
  for (let i = 0; i < 32; i++) { const q = Math.floor(r() * T.Q); qs.push(q); const pa = T.softmax(P.th[q]), pb = T.lenProbs(P, q), ai = [], rc = [], rl = [];
    for (let j = 0; j < 8; j++) { const a = sample(pa), b = sample(pb); ai.push([a, b]); rc.push(a === B.star[q] && r() < T.pok(T.L[b], B.need[q]) ? 1 : 0); rl.push(T.SET[st].len(T.L[b])); }
    acts.push(ai); Rc.push(rc); Rl.push(rl); }
  for (const m of Object.keys(T.METHODS)) { const cfg = T.METHODS[m], ad = T.advantages([Rc, Rl], cfg), g = T.grad(P, qs, acts, ad.A);
    cases.push({ setting: st, method: m, cfg, P, h: B.h, qs, acts, Rc, Rl, A: ad.A, s: ad.s, wt: ad.wt, g }); }
}
fs.mkdirSync(here + 'model', { recursive: true });
fs.writeFileSync(here + 'model/engine_case.json', JSON.stringify(cases));
console.log('cases', cases.length);
