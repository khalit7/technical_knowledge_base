// Click every control of the TPU and Pallas lab (t-tpu) at 390 px dark and 920 px light; fail on script errors, on "NaN",
// "undefined" or "null" in the tab's text, on sideways page scroll, on SVGs past the right edge, and on any network request.
// Also checks the page's JavaScript arithmetic against the recorded data. Screenshots to the folder given.
// usage: node src/tpu/check_tab.mjs <page index.html> <screenshot folder>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, outdir] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [], net = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  p.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) net.push(r.url()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  await p.click('button[data-t=t-tpu]');
  await sleep(600);
  const problems = [];
  const check = async (what) => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-tpu').innerText.replace(/full of NaN|them with NaN|\(NaN on CPU\)|fills them with NaN/g, '');
      const side = document.documentElement.scrollWidth > innerWidth;
      const svgs = [...document.querySelectorAll('#t-tpu svg')].filter(s => s.getBoundingClientRect().width > 0 && s.getBoundingClientRect().right > innerWidth + 1).length;
      return { nan: /\bNaN\b|Infinity/.test(t), und: /\bundefined\b|\bnull\b/.test(t), side, svgs, err: (d => d && !d.hidden ? d.textContent : '')(document.getElementById('jsErr')) };
    });
    if (r.nan || r.und || r.side || r.svgs || r.err) problems.push(what + ' ' + JSON.stringify(r));
  };
  const clickAll = async (sel, what) => {
    const n = await p.$$eval(sel, bs => bs.length);
    for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await check(what + ' ' + i); }
    return n;
  };
  const range = async (id, what, stepEvery = 1) => {
    const [mn, mx] = await p.$eval('#' + id, s => [+s.min, +s.max]);
    const vals = []; for (let v = mn; v <= mx; v += stepEvery) vals.push(v); if (vals[vals.length - 1] !== mx) vals.push(mx);
    let c = 0;
    for (const v of vals) { await p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input')) }, id, v); await check(what + ' ' + v); c++ }
    return c;
  };
  const selectAll = async (id, what, inner) => {
    const vals = await p.$$eval('#' + id + ' option', os => os.map(o => o.value));
    let c = 0;
    for (const v of vals) { await p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('change')) }, id, v); await check(what + ' ' + v); c++; if (inner) c += await inner(v) }
    return c;
  };
  await check('initial');
  const counts = {};
  counts.core = await clickAll('#tp-core-gen button', 'core gen');
  counts.pr = await clickAll('#t-tpu .tp-opts button', 'predict');
  // MXU: every op x both sides, scrub through
  counts.mx = await selectAll('tp-mx-op', 'mx op', async () => { let c = 0; for (let s = 0; s < 2; s++) { await p.evaluate(s => document.querySelectorAll('#tp-mx-side button')[s].click(), s); c += await range('tp-mx-ctl-s', 'mx step', 7) } return c });
  counts.mxBtns = await clickAll('#tp-mx-ctl button', 'mx btn');
  // roofline: gens x dtypes x tokens
  counts.rf = 0;
  for (let g = 0; g < 5; g++) for (let d = 0; d < 2; d++) { await p.evaluate((g, d) => { document.querySelectorAll('#tp-rf-gen button')[g].click(); document.querySelectorAll('#tp-rf-dt button')[d].click() }, g, d); counts.rf += await range('tp-rf-tok', 'rf ' + g + d) }
  // torus: every slice x mesh
  counts.to = await selectAll('tp-to-slice', 'slice', async () => selectAll('tp-to-mesh', 'mesh'));
  // ICI: every option of every select, both wrap settings
  counts.ici = 0;
  for (const id of ['tp-ici-v', 'tp-ici-k', 'tp-ici-g', 'tp-ici-x', 'tp-ici-n']) counts.ici += await selectAll(id, id);
  counts.ici += await clickAll('#tp-ici-w button', 'wrap');
  // grid animator: every config, every step; then the 2-core mode
  counts.gr = 0;
  const ncf = await p.$$eval('#tp-gr-cfg button', x => x.length);
  for (let i = 0; i < ncf; i++) { await p.evaluate(i => document.querySelectorAll('#tp-gr-cfg button')[i].click(), i); counts.gr += await range('tp-gr-ctl-s', 'grid ' + i, i === 0 ? 5 : 1) }
  await p.evaluate(() => document.querySelectorAll('#tp-gr-mode button')[1].click());
  counts.gr += await range('tp-gr-ctl-s', 'grid 2core');
  counts.grBtns = await clickAll('#tp-gr-ctl button', 'grid btn');
  counts.tr = await clickAll('#tp-tr-gen button', 'traffic gen');
  counts.det = await clickAll('#t-tpu details summary', 'details');
  // arithmetic in the page against the recorded data
  const ar = await p.evaluate(() => {
    const D = window.TPD, T = window.TP, out = [];
    const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
    D.gens.forEach(g => { if (!near(T.roofCalc.stepBound(g) * 1e6, D.roof.per_gen[g.gen].t_dots_us, 1e-3)) out.push('stepBound ' + g.gen) });
    D.roof.seven.forEach(r => { const s = T.roofCalc.seven(r.tokens); if (s.fl !== r.flops || s.by !== r.bytes) out.push('seven ' + r.tokens);
      D.gens.forEach(g => { if (!near(T.roofCalc.best(s.fl, s.by, g) * 1e3, r[g.gen].ms, 2e-3)) out.push('seven ms ' + r.tokens + g.gen) }) });
    D.roof.ops.forEach((o, i) => { [128, 256].forEach(s => { if (!near(T.mxuUtil(i, s), o.mxu_util[String(s)], 1e-3)) out.push('util ' + i + ' ' + s) }) });
    D.pal.traffic.forEach(t => { const a = T.gridAccount([t.bm, t.bn, t.bk]); if (a.steps !== t.steps || a.hbm !== t.hbm_bytes || a.copies.join() !== t.copies.join()) out.push('traffic ' + [t.bm, t.bn, t.bk]) });
    // the recorded 1-core walk is the lexicographic order the animator draws
    const lex = []; for (let i = 0; i < 8; i++) for (let k = 0; k < 4; k++) lex.push([i, 0, k, 0]);
    if (JSON.stringify(lex) !== JSON.stringify(D.pal.walk)) out.push('walk order');
    // scaling book example: 34 MB all-gather on a 4-chip v5e axis, 377 us with wraparound
    const v5e = D.gens.find(g => g.gen === 'v5e'); const t = T.ici(34e6, 'ag', v5e, 4, 1, true).t * 1e6; if (Math.round(t) !== 378 && Math.round(t) !== 377) out.push('ici ' + t);
    return out;
  });
  if (ar.length) problems.push('arithmetic ' + ar.join(', '));
  await p.evaluate(() => { document.querySelectorAll('#tp-mx-op option')[11] && (document.getElementById('tp-mx-op').value = '11'); document.getElementById('tp-mx-op').dispatchEvent(new Event('change')); document.querySelectorAll('#tp-gr-cfg button')[2].click(); const s = document.getElementById('tp-gr-ctl-s'); s.value = 6; s.dispatchEvent(new Event('input')); const m = document.getElementById('tp-mx-ctl-s'); m.value = 1; m.dispatchEvent(new Event('input')) });
  await sleep(500);
  for (const id of ['tp-s1', 'tp-s2', 'tp-s3', 'tp-s4', 'tp-s5', 'tp-s6', 'tp-s7', 'tp-s9', 'tp-s11']) {
    const el = await p.$('#' + id); await el.screenshot({ path: path.join(outdir, `${id}_${width}_${scheme}.png`) });
  }
  if (errs.length) problems.push('errors ' + errs.join(' | '));
  if (net.length) problems.push('network ' + net.join(' '));
  console.log(width, scheme, JSON.stringify(counts), problems.length ? 'PROBLEMS' : 'ok');
  problems.slice(0, 15).forEach(x => console.log('  ', x));
  bad += problems.length;
  await p.close();
}
await b.close();
console.log(bad ? 'FAIL ' + bad : 'PASS');
process.exit(bad ? 1 : 0);
