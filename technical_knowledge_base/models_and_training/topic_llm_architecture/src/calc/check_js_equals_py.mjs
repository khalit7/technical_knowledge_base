// node src/calc/check_js_equals_py.mjs : runs parts/33_js_cc_1core.js on every config and compares with out/py_results.json
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, '..', 'parts', '33_js_cc_1core.js'), 'utf8'), ctx);
const CC = ctx.window.CC; const py = JSON.parse(fs.readFileSync(path.join(here, 'out', 'py_results.json'), 'utf8'));
const cfgDir = path.join(here, '..', 'data', 'configs'); let bad = 0, n = 0;
function cmp(a, b, where) {
  if (typeof a === 'number' || typeof b === 'number') { n++;
    const ok = a === b || Math.abs(a - b) <= 1e-12 * Math.max(Math.abs(a), Math.abs(b));
    if (!ok) { bad++; if (bad < 20) console.log('DIFF', where, a, b); } return; }
  if (Array.isArray(a)) { if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.log('DIFF', where, a, b); } return; }
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) cmp(a?.[k], b?.[k], where + '.' + k);
}
for (const key of Object.keys(py)) {
  const s = CC.normalise(JSON.parse(fs.readFileSync(path.join(cfgDir, key + '.json'), 'utf8').replace(/\bInfinity\b/g, '1e999')));
  const js = { params: CC.params(s), flops: {}, cache: {}, notes: s.notes };
  for (const L of Object.keys(py[key].flops)) { js.flops[L] = CC.flops(s, +L); js.cache[L] = CC.cache(s, +L); }
  cmp(JSON.parse(JSON.stringify(js)), py[key], key);
}
console.log(`${Object.keys(py).length} configs, ${n} numbers compared, ${bad} differences`);
process.exit(bad ? 1 : 0);
