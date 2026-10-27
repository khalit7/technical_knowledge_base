// Run the page's JS DDPM (parts 10, 20, 22) in Node and compare with model/check_ref.json (check_forward.py).
// Writes model/check_forward.json, which the page quotes.
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import {fileURLToPath} from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
const ctx = {window: {}, atob: s => Buffer.from(s, 'base64').toString('latin1'), document: {getElementById: () => null}, console};
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['10_js_common.js', '20_model_data.js', '22_js_model.js']) vm.runInContext(fs.readFileSync(path.join(H, 'parts', f), 'utf8').replace(/^const DM=/m, 'var DM=').replace(/^function mulberry32/m, 'var mulberry32=function'), ctx);
const DM = ctx.DM, R = JSON.parse(fs.readFileSync(path.join(H, 'model', 'check_ref.json'), 'utf8'));
const out = {variants: {}};
let gmax = 0; const g = DM.gauss(3); R.gauss_seed3.forEach(v => gmax = Math.max(gmax, Math.abs(v - g())));
out.gauss_max_abs = gmax;
for (const [k, V] of Object.entries(R.variants)) {
  const N = DM.net(k), o = [0, 0]; let m = 0;
  V.x.forEach((x, i) => { DM.fwd(N, x[0], x[1], V.t[i], o); m = Math.max(m, Math.abs(o[0] - V.out[i][0]), Math.abs(o[1] - V.out[i][1])) });
  const r = {max_abs_js_vs_numpy_output: m, max_abs_numpy_vs_torch_output: V.max_abs_numpy_vs_torch, samples: {}};
  for (const sig of ['beta', 'btilde']) {
    const t0 = Date.now(), S = DM.sampler(k, 40, 5, sig).run(1000), ref = V.samples_seed5_n40[sig]; let d = 0;
    ref.forEach((p, i) => d = Math.max(d, Math.abs(p[0] - S.x[2 * i]), Math.abs(p[1] - S.x[2 * i + 1])));
    r.samples[sig] = {max_abs_final_sample_diff: d, ms_for_40x1000: Date.now() - t0};
  }
  out.variants[k] = r; console.log(k, JSON.stringify(r));
}
console.log('gaussian stream max diff', gmax);
fs.writeFileSync(path.join(H, 'model', 'check_forward.json'), JSON.stringify(out, null, 1));
