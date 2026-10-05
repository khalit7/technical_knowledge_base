// The page's JavaScript against the Python reference (out/recompute.json) and against the parent's calculator files.
// Usage (from the repo root): node <page>/src/check/check_page.mjs <page>
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const dir = process.argv[2];
const rc = JSON.parse(fs.readFileSync(path.join(dir, 'src/out/recompute.json')));
let bad = 0, n = 0;
const close = (a, b, what, tol = 1e-9) => { n++; const ok = Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)); if (!ok) { bad++; console.log('MISMATCH', what, a, b); } };
// 1. the copied calculator files are the parent's, unchanged apart from the first comment line
for (const [mine, root] of [['22_js_calcd.js', '32_js_calc_0data.js'], ['23_js_calcx.js', '32_js_calc_1core.js']]) {
  const a = fs.readFileSync(path.join(dir, 'src/parts', mine), 'utf8').split('\n').slice(1).join('\n');
  const b = fs.readFileSync(path.join(dir, '../src/parts', root), 'utf8').split('\n').slice(1).join('\n');
  n++; if (a !== b) { bad++; console.log('MISMATCH copy of the parent file', root); }
}
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
await p.goto('file://' + path.resolve(dir, 'index.html'));
const js = await p.evaluate(() => {
  const X = window.CALCX, A = window.PMA, L = window.PML, Q = window.PMP, out = { led: {}, act: {}, anim: {} };
  for (const T of [2048, 8192, 32768, 131072]) { const f = L.flops(X.M.l8, T, 'full', 'flash'), lg = A.ledger(X.M.l8, T); out.led[T] = { model: f.model, proj: f.proj, mlp: f.mlp, head: f.head, core_fwd: f.core_fwd, six_n: lg.six_n, six_n_matmul: lg.six_n_matmul }; }
  out.l70 = L.flops(X.M.l70, 8192, 'full', 'flash').model;
  out.ckpt_ratio = L.flops(X.M.l8, 8192, 'full', 'ckpt').hw / L.flops(X.M.l8, 8192, 'full', 'flash').model;
  out.act = { l8: A.actLayerTok(X.M.l8, 8192, 'flash'), l70: A.actLayerTok(X.M.l70, 8192, 'flash'), post: A.actPostTok(X.M.l8), eager: A.actLayerTok(X.M.l8, 8192, 'eager'), tot: L.mem(X.M.l8, 8192, 1, 'flash', 1).total };
  for (const m of ['eager', 'flash', 'ckpt']) { const r = A.memAnim(m); out.anim[m] = { peak: r.peak, total: r.total_fl, steps: r.steps.map(s => [s.mem, s.fl + s.flr]) }; }
  const r = Q.run({ model: 'l8', chip: 'h100', tokens: 15e12, mfu: 0.4, good: 0.9, days: 30, seq: 0 });
  const r2 = Q.run({ model: 'l8', chip: 'b200', tokens: 15e12, mfu: 0.4, good: 0.9, days: 30, seq: 0 });
  out.run = { gpuh: r.gpuh, cost: r.cost, gpus: r.gpus, gpuh_b: r2.gpuh, cost_b: r2.cost };
  const s = Q.serve({ model: 'l8', chip: 'h100', n: 1, fmt: 'bf16', kvb: 2, ctx: 4096, eff: 1, price: 3.99 });
  out.serve = { b1: s[0], b64: s[6] };
  out.cross = L.crossT(X.M.l8, 'full', 'flash');
  return out;
});
await b.close();
for (const T of [2048, 8192, 32768, 131072]) {
  const r = rc.ledger_l8[T], j = js.led[T];
  close(j.model, r.formula_total, 'ledger total ' + T); close(j.model + 128, r.traced_total, 'ledger vs trace ' + T, 1e-12 * 1e3);
  for (const k of ['proj', 'mlp', 'head', 'core_fwd', 'six_n', 'six_n_matmul']) close(j[k], r[k], 'ledger ' + k + ' ' + T);
}
close(js.l70 / (6 * 70553706496) - 1, rc.l70_traced_over_6n, 'l70 traced', 1e-8);
close(js.ckpt_ratio, rc.hfu_ratio_ckpt, 'ckpt ratio', 1e-9);
close(js.act.l8, rc.act_layer_tok_l8, 'act l8'); close(js.act.l70, rc.act_layer_tok_l70, 'act l70'); close(js.act.post, rc.act_post_tok, 'act post');
close(js.act.tot / 1e9, rc.act_total_formula_flash_GB, 'act total');
for (const m of ['eager', 'flash', 'ckpt']) close(js.anim[m].peak / 1e9, rc.anim_peaks_GB[m], 'anim peak ' + m);
close(js.anim.flash.total, rc.step_tf_8k * 1e12, 'anim flops (trace adds 128 FLOPs per token of RoPE)', 1e-8);
close(js.run.gpuh, rc.gpuh_h100, 'gpuh h100'); close(js.run.cost / 0.9 * 0.9, rc.usd_h100_good90, 'usd h100 good');
close(js.run.gpus, rc.gpus_30d_h100, 'gpus 30d'); close(js.run.gpuh_b, rc.gpuh_b200, 'gpuh b200'); close(js.run.cost_b, rc.usd_b200_good90, 'usd b200');
close(js.serve.b1.usd, rc.usd_mtok_b1, 'usd b1'); close(js.serve.b64.usd, rc.usd_mtok_b64, 'usd b64'); close(js.serve.b64.B, 64, 'batch 64 row');
close(js.serve.b1.t_ms, rc.tpot_b1_ms, 'tpot b1'); close(js.serve.b64.total, rc.tps_b64, 'tps b64');
console.log(`check_page: ${n - bad} of ${n} comparisons match` + (bad ? `, ${bad} MISMATCH` : ''));
process.exit(bad ? 1 : 0);
