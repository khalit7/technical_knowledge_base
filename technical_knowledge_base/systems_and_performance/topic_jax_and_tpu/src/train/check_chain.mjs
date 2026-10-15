// Check the page's JavaScript optax (parts/33_js_tr_0opt.js) against optax 0.2.8's own outputs (out/chain_ref.json,
// written by optax_check.py) for every combination of the chain builder. Writes out/chain_check.json.
// Run: node src/train/check_chain.mjs
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import {fileURLToPath} from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ctx = {window: {}, Math}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(HERE, '..', 'parts', '33_js_tr_0opt.js'), 'utf8'), ctx);
const ref = JSON.parse(fs.readFileSync(path.join(HERE, 'out', 'chain_ref.json'), 'utf8'));
let worstRel = 0, worstAbs = 0, worstCase = null, n = 0, fails = 0;
for (const c of ref.cases) {
  const r = ctx.window.TROPT({opt: c.opt, clip: c.clip, wd: c.wd, mask: c.mask, sched: c.sched, lr: c.lr}, ref.grads, ref.params0, ref.decay_mask);
  let caseRel = 0;
  c.updates.forEach((u, k) => u.forEach((x, i) => {
    const y = r.updates[k][i], a = Math.abs(x - y), rel = a / Math.max(Math.abs(x), c.lr * 1e-3);
    n++; if (a > worstAbs) worstAbs = a; if (rel > caseRel) caseRel = rel;
  }));
  if (caseRel > worstRel) { worstRel = caseRel; worstCase = c.opt + ' ' + c.sched + ' lr ' + c.lr + ' clip ' + c.clip + ' wd ' + c.wd + ' mask ' + c.mask; }
  if (caseRel > 1e-4) fails++;
}
const text = ref.cases.length + ' combinations, ' + n + ' updates agree to within ' + worstAbs.toExponential(1) + ' absolute, ' + worstRel.toExponential(1) + ' relative: float32 rounding';
const out = {cases: ref.cases.length, updates: n, worst_rel: worstRel, worst_abs: worstAbs, worst_case: worstCase, fails, text};
fs.writeFileSync(path.join(HERE, 'out', 'chain_check.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
process.exit(fails ? 1 : 0);
