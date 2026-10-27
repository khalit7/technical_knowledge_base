// node src/check_engine.mjs : dump one case from the JS engine (world, student weights, a sampled batch, the JS
// losses and gradients, pi_lambda on every prefix) to model/engine_case.json for check_engine.py (PyTorch autograd).
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const here = path.dirname(url.fileURLToPath(import.meta.url));
const OPD = createRequire(import.meta.url)(path.join(here, 'parts', '22_js_toy.js'));
const W = OPD.world(1), out = { world: { zT1: W.zT1, zT2: W.zT2, zS1: W.zS1, zS2: W.zS2, tT: W.tT, tS: W.tS }, cases: [] };
for (const M of ['mlp', 'table']) {
  // a partly trained student, so gradients are not at the starting point
  const th = OPD.train(W, { model: M, kind: 'r', lam: 1, lr: 0.05, seed: 3, steps: 20 }).theta;
  const bt = OPD.batch(W, M, th, 0.5, 32, OPD.rng(11));
  const c = { model: M, theta: th, batch: bt, lg: {}, eg: {}, lam: {} };
  for (const kind of ['f', 'r']) { const r = OPD.lossGrad(W, M, th, kind, bt); c.lg[kind] = { loss: r.loss, g: r.g }; c.eg[kind] = {}; for (const l of [-1.6, -1, 0.3, 1, 1.7]) c.eg[kind][l] = OPD.expectedGrad(W, M, th, kind, l); }
  for (const l of [-2, -1.6, -1, -0.4, 0, 0.7, 1, 1.3, 2]) c.lam[l] = [...Array(12).keys()].map(p => OPD.lambdaProbs(OPD.logS1(W, M, th, p), OPD.logT1(W, p), l));
  out.cases.push(c);
}
fs.writeFileSync(path.join(here, 'model', 'engine_case.json'), JSON.stringify(out));
console.log('wrote model/engine_case.json');
