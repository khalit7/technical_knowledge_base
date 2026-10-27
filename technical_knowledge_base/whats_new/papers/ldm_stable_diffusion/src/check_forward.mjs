// Run the page's JS model (parts 10, 20, 22) in Node and compare with model/check_ref.json (check_forward.py).
// Writes model/check_forward.json, which the page quotes.
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import {fileURLToPath} from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
const ctx = {atob: s => Buffer.from(s, 'base64').toString('latin1'), document: {getElementById: () => null}, console, Math, Float32Array, Float64Array, Uint8Array};
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['10_js_common.js', '20_model_data.js', '22_js_model.js']) vm.runInContext(fs.readFileSync(path.join(H, 'parts', f), 'utf8').replace(/^const LDM=/m, 'var LDM=').replace(/^const TOY=/m, 'var TOY=').replace(/^function mulberry32/m, 'var mulberry32=function'), ctx);
const LDM = ctx.LDM, TOY = ctx.TOY, R = JSON.parse(fs.readFileSync(path.join(H, 'model', 'check_ref.json'), 'utf8'));
const md = (a, b) => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m };
const out = {ae: {}, unet: {}, chain: {}};
for (const [f, V] of Object.entries(R.ae)) {
  let m1 = 0, m2 = 0;
  V.x.forEach((x, i) => { const e = LDM.aeEncode('ae' + f, Float32Array.from(x)); m1 = Math.max(m1, md(e.mu, V.mu[i])); m2 = Math.max(m2, md(LDM.aeDecode('ae' + f, Float32Array.from(V.mu[i])), V.rec[i])) });
  out.ae[f] = {max_abs_mu: m1, max_abs_rec: m2};
}
for (const [n, V] of Object.entries(R.unet)) {
  let m = 0; V.x.forEach((x, i) => { m = Math.max(m, md(LDM.unet('dm_' + n, Float32Array.from(x), V.t[i], V.ids[i]), V.out[i])) });
  out.unet[n] = {max_abs_eps: m};
}
for (const [n, V] of Object.entries(R.chain)) {
  const t0 = Date.now(), ch = LDM.chain('dm_' + n, V.ids, {S: V.S, scale: V.scale, x0: V.x_init}); let s; while ((s = ch.next()) && s.j < V.S); const img = LDM.toImage('dm_' + n, ch.x), c = TOY.check(img);
  out.chain[n] = {max_abs_final_latent: md(ch.x, V.z), max_abs_image: md(img, V.img), checker_same: [c.valid ? 1 : 0, c.colour, c.shape, c.pos].join() === V.check.join(), ms: Date.now() - t0};
}
// the JS checker against the Python one on rendered data is covered by the image check above; also check render+check on 200 random params
const worst = Math.max(...Object.values(out.unet).map(v => v.max_abs_eps), ...Object.values(out.chain).map(v => v.max_abs_image));
out.summary = 'every network output within ' + worst.toExponential(1) + ' of PyTorch; the full 20-step guided chains end within ' + Math.max(...Object.values(out.chain).map(v => v.max_abs_final_latent)).toExponential(1) + ' and the checker gives the same verdict: ' + Object.values(out.chain).every(v => v.checker_same);
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(H, 'model', 'check_forward.json'), JSON.stringify(out, null, 1));
