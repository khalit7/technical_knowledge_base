// The page's JavaScript toy against the Python reference (out/gmm_ref.json): x0hat and deterministic DDIM to 1e-9.
// Also the schedule helpers against out/recompute.json. Run: node runs/check_toy.mjs (from src/).
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import {fileURLToPath} from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), src = path.join(here, '..');
const ctx = {window: {}, Math, Float64Array, Uint8Array, atob: s => Buffer.from(s, 'base64').toString('binary'), console};
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['22_js_dz_common.js', '23_js_dz_toy.js']) vm.runInContext(fs.readFileSync(path.join(src, 'parts', f), 'utf8'), ctx);
const ref = JSON.parse(fs.readFileSync(path.join(src, 'out', 'gmm_ref.json')));
let worst = 0, n = 0;
for (const r of ref.x0hat) r.x.forEach((x, i) => { const d = Math.abs(ctx.DZT.x0hat(x, ctx.DZT.ab[r.t], r.tau) - r.y[i]); worst = Math.max(worst, d); n++; });
for (const r of ref.ddim) {
  const ts = ctx.DZT.trailing(r.n);
  r.x.forEach((x0, i) => { let x = x0;
    for (let k = 0; k < r.n; k++) { const a = ctx.DZT.ab[ts[k]], ap = k + 1 < r.n ? ctx.DZT.ab[ts[k + 1]] : 1;
      const xh = ctx.DZT.x0hat(x, a, r.tau), e = (x - Math.sqrt(a) * xh) / Math.sqrt(1 - a); x = Math.sqrt(ap) * xh + Math.sqrt(1 - ap) * e; }
    worst = Math.max(worst, Math.abs(x - r.y[i])); n++; });
}
console.log('toy: compared', n, 'values, worst abs diff', worst.toExponential(2), worst < 1e-9 ? 'OK' : 'FAIL');
const rp = path.join(src, 'out', 'recompute.json');
if (fs.existsSync(rp)) {
  const rc = JSON.parse(fs.readFileSync(rp)); let bad = 0, m = 0;
  for (const c of rc.schedule_checks) { const a = ctx.DZC.sched(c.name, {zt: c.zt}); const v = a[c.t];
    const d = Math.abs(v - c.abar) / Math.max(1e-300, Math.abs(c.abar)); m++; if (d > 1e-9 && Math.abs(v - c.abar) > 1e-15) { bad++; console.log('mismatch', c, v); } }
  console.log('schedules: compared', m, 'values,', bad ? bad + ' FAIL' : 'OK');
}
