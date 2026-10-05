// Checks that the built page embeds exactly chips.json and that its JavaScript and prose agree with recompute.py.
// Run from the repo root after `python3 src/chips/recompute.py` and `sh src/build.sh`:
//   node technical_knowledge_base/systems_and_performance/topic_hardware/src/chips/check_page.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const exp = JSON.parse(fs.readFileSync(path.join(here, 'expected.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(here, 'chips.json'), 'utf8'));
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
await p.goto('file://' + path.resolve(here, '../../index.html'));
await p.click('button[data-t=t-chips]');
const r = await p.evaluate(() => {
  const X = window.CHIPX, out = { ridge: {}, peel: {}, growth: window.CHIPGROWTH().map(g => ({ id: g.id, bf16: g.bf, low: g.lo, bw: g.bw, mem: g.mem })) };
  X.L.forEach(c => { out.ridge[c.id] = {}; ['bf16', 'fp8', 'fp4', 'fp32'].forEach(f => { const v = X.ridge(c, f); if (v != null) out.ridge[c.id][f] = v }) });
  ['gb200_vs_h100', 'gb300_vs_dgxb200', 'v7pod_vs_gb300', 'helios_vs_vr'].forEach(k => out.peel[k] = window.CHIPPEEL(k));
  out.ai = { bf16: [window.CHIPAI(1, 8192, 8192, 2), window.CHIPAI(64, 8192, 8192, 2), window.CHIPAI(4096, 4096, 4096, 2)] };
  out.embedded = JSON.stringify(window.CHIPD);
  out.text = document.getElementById('t-chips').innerText;
  return out;
});
let fails = [];
const close = (a, b, tol, what) => { if (Math.abs(a - b) > tol * Math.max(1, Math.abs(b))) fails.push(`${what}: page ${a} vs reference ${b}`) };
if (r.embedded !== JSON.stringify(data)) fails.push('embedded data differs from chips.json');
for (const [id, row] of Object.entries(exp.ridge)) for (const [f, v] of Object.entries(row)) close(r.ridge[id][f], v, 0.001, `ridge ${id} ${f}`);
for (const [k, v] of Object.entries(exp.peel)) {
  const pg = r.peel[k];
  close(pg.a[0], v.a.headline, 1e-9, k + ' a headline'); close(pg.a[1], v.a.per_chip, 0.001, k + ' a per chip'); close(pg.a[2], v.a.dense, 1e-9, k + ' a dense'); close(pg.a[3], v.a.bf16, 1e-9, k + ' a bf16');
  close(pg.b[0], v.b.headline, 1e-9, k + ' b headline'); close(pg.b[1], v.b.per_chip, 0.001, k + ' b per chip'); close(pg.b[2], v.b.dense, 1e-9, k + ' b dense'); close(pg.b[3], v.b.bf16, 1e-9, k + ' b bf16');
}
exp.gen_growth.forEach((g, i) => ['bf16', 'low', 'bw', 'mem'].forEach(k => close(r.growth[i][k], g[k], 0.005, `growth ${g.id} ${k}`)));
exp.ai_lines.bf16.forEach((v, i) => close(r.ai.bf16[i], v, 0.001, 'AI line ' + i));
// numbers stated in prose, checked against the reference
const prose = [
  ['364x', Math.round(exp.peel.gb200_vs_h100.headline_ratio) + 'x'],
  ['about 2.5x per chip', 'about ' + exp.peel.gb200_vs_h100.bf16_ratio.toFixed(1) + 'x per chip'],
  ['near 1,400', 'near ' + (Math.round(exp.ai_lines.bf16[2] / 100) * 100).toLocaleString('en-US')],
  ['BF16 13x, NVFP4 112x, and HBM4 at 22 TB/s, 11x', `BF16 ${Math.round(exp.gen_growth[5].bf16)}x, NVFP4 ${Math.round(exp.gen_growth[5].low)}x, and HBM4 at 22 TB/s, ${Math.round(exp.gen_growth[5].bw)}x`],
  ['now 43x the A100 while bandwidth is 3.9x', `now ${Math.round(exp.gen_growth[4].low)}x the A100 while bandwidth is ${exp.gen_growth[4].bw.toFixed(1)}x`],
  ['bandwidth 2.4x the A100 and memory 1.8x', `bandwidth ${exp.gen_growth[2].bw.toFixed(1)}x the A100 and memory ${exp.gen_growth[2].mem.toFixed(1)}x`],
  ['BF16 7.2x, FP4 (new) 29x, bandwidth 3.9x', `BF16 ${exp.gen_growth[3].bf16.toFixed(1)}x, FP4 (new) ${Math.round(exp.gen_growth[3].low)}x, bandwidth ${exp.gen_growth[3].bw.toFixed(1)}x`],
  ['BF16 compute 3.2x, FP8 (new) 6.3x, but bandwidth only 1.6x', `BF16 compute ${exp.gen_growth[1].bf16.toFixed(1)}x, FP8 (new) ${exp.gen_growth[1].low.toFixed(1)}x, but bandwidth only ${exp.gen_growth[1].bw.toFixed(1)}x`],
];
const src = fs.readFileSync(path.resolve(here, '../../index.html'), 'utf8');
prose.forEach(([said, should]) => { if (said !== should) fails.push(`prose "${said}" should read "${should}"`); if (!src.includes(said)) fails.push(`prose "${said}" not found in page`) });
await b.close();
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'check_page: embedded data, ridge, peel, growth, AI lines and prose numbers all match recompute.py');
process.exit(fails.length ? 1 : 0);
