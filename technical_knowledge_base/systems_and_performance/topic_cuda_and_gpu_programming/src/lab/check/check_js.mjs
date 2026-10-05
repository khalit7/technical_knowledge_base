// Checks for the Kernel lab tab (run from anywhere with node):
// 1) the built page embeds exactly out/data.json; 2) the page's JavaScript (LABX.calc) reproduces out/expected.json
// from recompute.py; 3) hand-written numbers in the tab's HTML agree with the data.
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), lab = path.join(here, '..'), parts = path.join(lab, '..', 'parts');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
const data = JSON.parse(fs.readFileSync(path.join(lab, 'out', 'data.json')));
const exp = JSON.parse(fs.readFileSync(path.join(lab, 'out', 'expected.json')));
const html = fs.readFileSync(path.join(lab, '..', '..', 'index.html'), 'utf8');
const m = html.match(/window\.LABD=(\{.*?\});\n/s);
ok(m && JSON.stringify(JSON.parse(m[1])) === JSON.stringify(data), 'page embeds out/data.json exactly');
const ctx = { window: {}, document: { addEventListener() {}, getElementById() { return null } }, addEventListener() {}, matchMedia: () => ({ matches: false }) };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(parts, '33_js_lab_0data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(parts, '33_js_lab_1core.js'), 'utf8'), ctx);
const X = ctx.LABX, C = X.calc, close = (a, b, t = 1e-9) => Math.abs(a - b) <= t * Math.max(1, Math.abs(b));
let n = 0;
const s6 = X.find('softmax', 'S6'), minb = C.smMinBytes(s6.R, s6.C);
for (const c of data.cases) {
  if (c.group === 'softmax') { ok(close(C.gbs(minb, c.ms), exp.gbs[c.name]), 'gbs ' + c.name); n++ }
  if (c.flops) { ok(close(C.gflops(c.flops, c.ms), exp.gflops[c.name]), 'gflops ' + c.name); n++ }
}
for (const [k, v] of Object.entries(exp.fused_bytes)) { const [mo, N] = k.split('.'); ok(C.fusedBytes(mo, +N, 64) === v, 'fused ' + k); n++ }
for (const [N, a] of Object.entries(exp.attn)) { if (typeof a !== 'object') continue;
  ok(close((C.naiveAttnBytes(4, +N, 4) + C.attnInputs(4, +N, 64, 4)) / 2 ** 20, a.naive_model_mib), 'attn mem ' + N);
  ok(C.attnFlops(4, +N, 64) === a.flops, 'attn flops ' + N); n += 2 }
ok(C.naiveAttnBytes(32, 131072, 2) === exp.attn.llama_like_128k_bytes, '128k'); n++;
ok(close(C.floorMs(minb, 3.35), exp.h100_softmax_floor_ms), 'h100 floor'); n++;
const row = C.demoRow();
ok(JSON.stringify(row.s) === JSON.stringify(exp.demo.s) && JSON.stringify(row.v) === JSON.stringify(exp.demo.v), 'demo row'); n++;
const on = C.online(row.s, row.v, 4), nv = C.naive(row.s, row.v);
ok(close(on[on.length - 1].out, exp.demo.online_out, 1e-12) && close(nv.out, exp.demo.naive_out, 1e-12), 'demo outputs'); n++;
// hand-written numbers in the tab's HTML
const tabHtml = fs.readFileSync(path.join(parts, '33_tab_lab.html'), 'utf8'), R = data.roof;
const claims = [['ridge point of about 30', Math.round(R.peak_fp32_gf / R.copy_gbs) === 30],
  ['about 20 times the memory bandwidth', Math.round(3350 / R.copy_gbs) === 20],
  ['about 200 times the matrix throughput', Math.abs(989.5e3 / R.peak_fp32_gf - 200) < 5],
  ['17.2 billion floating-point operations', (2 * 2048 ** 3 / 1e9).toFixed(1) === '17.2'],
  ['about 340 operations per byte', Math.round(2 * 2048 ** 3 / (12 * 2048 ** 2)) === 341],
  ['on 48 MiB of data', 12 * 2048 ** 2 / 2 ** 20 === 48],
  ['256 MiB in, 256 MiB out', 4 * s6.R * s6.C / 2 ** 20 === 256]];
for (const [t, c] of claims) { ok(tabHtml.includes(t), 'text present: ' + t); ok(c, 'claim holds: ' + t); n += 2 }
console.log('checks', n, 'fail', fail); process.exit(fail ? 1 : 0);
