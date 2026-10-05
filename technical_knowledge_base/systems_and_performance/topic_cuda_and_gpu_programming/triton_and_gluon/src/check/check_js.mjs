// Checks the page's JavaScript models against the Python reference (src/out/expected.json, from src/code/recompute.py):
// occupancy, the shared-memory rule, the layout bases (and Triton's printed ones), the grouped-ordering counts.
// Loads the built page in a headless browser and calls window.TG_* functions there.
// Run from the repo root: node technical_knowledge_base/.../triton_and_gluon/src/check/check_js.mjs
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const exp = JSON.parse(fs.readFileSync(path.resolve(here, '../out/expected.json'), 'utf8'));
const comp = JSON.parse(fs.readFileSync(path.resolve(here, '../out/compile.json'), 'utf8'));
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const p = await browser.newPage();
await p.goto('file://' + path.resolve(here, '../../index.html'), { waitUntil: 'load' });
const res = await p.evaluate((exp, comp) => {
  const out = { occ: [0, 0], smem: [0, 0], lay: [0, 0], grouped: [0, 0], bad: [] };
  const sweep = Object.fromEntries(comp.sweep.filter(r => r.ok).map(r => [r.key + '|' + r.target, r]));
  exp.occupancy.forEach(o => { const r = sweep[o.key + '|' + o.target]; const js = TG_occ(o.target, r.regs, r.shared, r.num_warps).blocks;
    out.occ[0]++; if (js === o.blocks) out.occ[1]++; else out.bad.push(['occ', o, js]); });
  exp.tutorial_configs.forEach(t => { const [bm, bn, bk] = t.key.split('_')[1].split('x').map(Number); const ns = +t.key.split('_s')[1].split('_')[0];
    const js = TG_smem(t.async, ns, bm, bn, bk, 2); out.smem[0]++; if (js === t.model) out.smem[1]++; else out.bad.push(['smem', t, js]); });
  exp.smem_stages.forEach(t => { const js = TG_smem(t.async, t.ns, 128, 128, 64, 2); out.smem[0]++; if (js === t.model) out.smem[1]++; else out.bad.push(['smem', t, js]); });
  exp.layouts.forEach(l => { const [spt, tpw, wpc, order, shape] = l.case; const B = TG_bases(spt, tpw, wpc, order, shape);
    const ok = JSON.stringify([B.reg, B.lane, B.warp]) === JSON.stringify(l.triton); out.lay[0]++; if (ok) out.lay[1]++; else out.bad.push(['layout', l.case]); });
  ['row', 'grouped'].forEach(m => { exp.grouped_seq[m].forEach((v, i) => { out.grouped[0]++; }); });
  // grouped: re-derive with the page's animation state function
  const seg = document.querySelector('#rd-gr-mode');
  ['row', 'grouped'].forEach(m => { seg.querySelector('button[data-m="' + m + '"]').click();
    exp.grouped_seq[m].forEach((v, i) => { if (TG_grouped(i + 1) === v) out.grouped[1]++; else out.bad.push(['grouped', m, i, v, TG_grouped(i + 1)]); }); });
  return out;
}, exp, comp);
await browser.close();
let fail = res.bad.length;
for (const k of ['occ', 'smem', 'lay', 'grouped']) console.log(k, res[k][1] + '/' + res[k][0]);
if (fail) console.log('MISMATCHES', JSON.stringify(res.bad.slice(0, 5)));
console.log('js check', fail ? 'FAILED' : 'ok');
