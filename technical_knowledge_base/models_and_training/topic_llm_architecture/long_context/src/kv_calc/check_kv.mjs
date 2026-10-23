// node src/kv_calc/check_kv.mjs : the calculator's JavaScript engine (parts/19_js_kc_1core.js) against
// make_kv_data.py's out/recompute.json, every preset at 1K, 4K, 32K, 128K and 1M tokens. Exits 1 on any difference.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const H = path.dirname(new URL(import.meta.url).pathname), ctx = {}; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['19_js_kc_0data.js', '19_js_kc_1core.js']) vm.runInContext(fs.readFileSync(path.join(H, '../parts', f), 'utf8'), ctx);
const KC = ctx.window.KC, ref = JSON.parse(fs.readFileSync(path.join(H, 'out/recompute.json'), 'utf8')).presets;
let n = 0, bad = 0;
for (const [k, r] of Object.entries(ref)) for (const [t, v] of Object.entries(r)) { n++; const got = KC.seq(KC.byKey[k], +t).total; if (Math.abs(got - v) > 1e-6 * v) { bad++; console.log('DIFF', k, t, got, v) } }
console.log(`check_kv: ${n} values, ${bad} differences`); process.exit(bad ? 1 : 0);
