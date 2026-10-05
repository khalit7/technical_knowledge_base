// Clicks every control of the page at 390 px (dark) and 920 px (light); reports errors, NaN, undefined, sideways scroll;
// saves element screenshots to the folder given as the first argument (default: ./shots).
// Run from the repo root: node technical_knowledge_base/.../memory_hierarchy/src/check/check_ui.mjs <outdir>
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const page_ = 'file://' + path.resolve(here, '../../index.html');
const out = process.argv[2] || 'shots';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let fail = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(page_, { waitUntil: 'load' });
  await p.click('#tabs button[data-t="t-read"]');
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await new Promise(r => setTimeout(r, 250)); await el.screenshot({ path: `${out}/${name}-${scheme}-${w}.png` }); } };
  const check = async (tag) => {
    const r = await p.evaluate(() => {
      const vis = [...document.querySelectorAll('.tab')].find(t => !t.hidden);
      const txt = vis ? vis.innerText : '';
      return { nan: /\bNaN\b/.test(txt), undef: /\bundefined\b/.test(txt), side: document.documentElement.scrollWidth > innerWidth + 1, err: !document.getElementById('jsErr').hidden };
    });
    if (r.nan || r.undef || r.side || r.err) { fail++; console.log('FAIL', scheme, w, tag, JSON.stringify(r)); }
  };
  const clickAll = async (sel) => { for (const b of await p.$$(sel)) { await b.evaluate(x => x.scrollIntoView({ block: 'center' })); await b.click(); await new Promise(r => setTimeout(r, 120)); } };
  // Reading
  await clickAll('#rd-wseg button'); await clickAll('#rd-wba button');
  await clickAll('#rd-wctl button'); await check('warp');
  await p.click('#rd-wseg button[data-m="aos"]'); await p.click('#rd-wba button[data-m="0"]');
  for (let i = 0; i < 9; i++) await p.click('#rd-wctl-f');
  await shot('#rd-wcard', 'warp-aos-before');
  await clickAll('#rd-pseg button'); await clickAll('#rd-pctl button');
  await p.click('#rd-pseg button[data-m="3"]'); for (let i = 0; i < 9; i++) await p.click('#rd-pctl-f');
  await shot('#rd-pcard', 'pipe-3'); await check('pipe');
  await clickAll('#rd-rcseg button'); await shot('#rd-rcchart', 'regcap'); await check('regcap');
  await clickAll('#t-read .pr button[data-a]'); await check('predict');
  for (const v of ['softmax_fused', 'softmax_eager', 'mm_mlx', 'mm_naive', '']) { await p.select('#rd-cpre', v); for (const g of ['h100', 'a100', 'r5090', 'm1']) { await p.select('#rd-cgpu', g); for (const pr of ['bf16', 'fp32']) await p.select('#rd-cprec', pr); } }
  await check('calc');
  await shot('#rd-roof', 'roof'); await shot('#rd-ccard', 'calc'); await shot('#rd-cops', 'cops'); await shot('#rd-consttbl', 'const');
  await shot('#rd-s6 .rd-two', 'async'); await shot('#rd-aosbars', 'aosbars'); await shot('#rd-tgbars', 'tgbars');
  // Access lab
  await p.click('#tabs button[data-t="t-acc"]'); await new Promise(r => setTimeout(r, 200));
  const n = await p.$$eval('#acc-gpre option', o => o.length);
  for (let i = 0; i < n; i++) { await p.select('#acc-gpre', String(i)); await check('gpre' + i); }
  await p.select('#acc-gpre', '5'); await shot('#t-acc .card', 'acc-global');
  await p.select('#acc-smode', 'stride');
  for (const wv of ['4', '8', '16']) { await p.select('#acc-sw', wv); for (const s of ['0', '1', '2', '8', '9', '32']) { await p.$eval('#acc-ss', (e, s) => { e.value = s; e.dispatchEvent(new Event('input')); }, s); await check(`s${wv}-${s}`); } }
  await p.select('#acc-smode', 'col');
  for (const l of ['plain', 'pad', 'xor']) { await p.select('#acc-slay', l); await check('col' + l); }
  await p.select('#acc-slay', 'plain'); const cards = await p.$$('#t-acc .card'); await cards[1].screenshot({ path: `${out}/acc-shared-${scheme}-${w}.png` });
  // Memory instructions
  await p.click('#tabs button[data-t="t-sass"]');
  const files = await p.$$eval('#sx-file option', o => o.map(x => x.value));
  for (const f of files) { await p.select('#sx-file', f); for (const a of ['sm_80', 'sm_90a', 'sm_120']) { await p.select('#sx-arch', a); await check(f + a); } }
  await p.click('#tabs button[data-t="t-more"]'); await check('more');
  if (errs.length) { fail++; console.log('ERRORS', scheme, w, errs.slice(0, 5)); }
  await p.close();
}
await browser.close();
console.log('ui check', fail ? 'FAILED ' + fail : 'ok');
