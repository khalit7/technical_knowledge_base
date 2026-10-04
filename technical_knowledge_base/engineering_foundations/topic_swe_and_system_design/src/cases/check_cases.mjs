// Exercise every control of the Case files tab at 390 px dark and 920 px light.
// Fails on page errors, NaN/undefined in the tab, sideways scroll, or a mismatch between the animation's
// JavaScript model and recompute_out.json. Screenshots go to ../../.shots/cases_*.png (page folder, not committed).
// Run: node src/cases/check_cases.mjs   (from the page folder)
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const page = path.resolve(here, '..', '..');
const repo = path.resolve(page, '..', '..', '..');
const require = createRequire(path.join(repo, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const rec = JSON.parse(fs.readFileSync(path.join(here, 'recompute_out.json'), 'utf8'));
const shots = path.join(page, '.shots'); fs.mkdirSync(shots, { recursive: true });
const opts = { headless: 'shell' };
if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
const browser = await puppeteer.launch(opts);
let fail = 0;
const bad = m => { fail++; console.log('FAIL', m); };
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.join(page, 'index.html'));
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.click('#tabs button[data-t="t-cases"]');
  await new Promise(r => setTimeout(r, 400));
  const check = async (label) => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-cases');
      const txt = t.innerText;
      const sw = document.scrollingElement.scrollWidth, cw = document.scrollingElement.clientWidth;
      const over = [...t.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > cw + 1 && !e.closest('svg text'); }).map(e => e.tagName + '.' + e.className).slice(0, 5);
      return { nan: /\bNaN\b|\bundefined\b|\[object/.test(txt), sw, cw, over, err: !document.getElementById('jsErr').hidden };
    });
    if (r.nan) bad(`${w} ${label}: NaN/undefined in text`);
    if (r.sw > r.cw) bad(`${w} ${label}: sideways scroll ${r.sw} > ${r.cw}`);
    if (r.over.length) bad(`${w} ${label}: elements past the right edge ${r.over.join(' ')}`);
    if (r.err) bad(`${w} ${label}: error box shown`);
  };
  await check('open');
  // model parity with recompute.py
  const sim = await p.evaluate(() => window.CF_SIM);
  for (const k of ['before', 'after']) {
    const a = sim[k], b = rec.anim[k];
    if (a.length !== b.length) bad(`${k} steps ${a.length} vs ${b.length}`);
    a.forEach((s, i) => { for (const f of ['leased', 'queue', 'wasted', 'done', 'outside']) if (s[f] !== b[i][f]) bad(`${k} step ${i} ${f} ${s[f]} vs ${b[i][f]}`); });
  }
  await p.screenshot({ path: path.join(shots, `cases_${w}_top.png`) });
  // animation: both modes, every step
  for (const m of ['before', 'after']) {
    await p.click(`#cf-an-mode button[data-m="${m}"]`);
    const n = await p.evaluate(() => +document.getElementById('cf-an-ctl-s').max + 1);
    await p.click('#cf-an-ctl-p'); await p.click('#cf-an-ctl-p'); // play, pause
    for (let i = 0; i < n + 1; i++) await p.click('#cf-an-ctl-f');
    await check(`anim ${m} end`);
    const el = await p.$('#cf-an'); await el.screenshot({ path: path.join(shots, `cases_${w}_anim_${m}.png`) });
    for (let i = 0; i < 3; i++) await p.click('#cf-an-ctl-b');
    await p.evaluate(() => { const s = document.getElementById('cf-an-ctl-s'); s.value = 2; s.dispatchEvent(new Event('input')); });
    await p.select('#cf-an-ctl-v', '2');
    await check(`anim ${m} scrub`);
  }
  // filters
  const keys = await p.$$eval('#cf-blocks button', b => b.map(x => x.dataset.k));
  for (const k of keys) {
    await p.click(`#cf-blocks button[data-k="${k}"]`);
    const c = await p.$eval('#cf-cards', e => e.querySelectorAll('.cf-card').length);
    if (!c) bad(`block ${k}: no cards`);
    await check(`block ${k}`);
  }
  for (const m of ['outage', 'architecture', 'all']) { await p.click(`#cf-type button[data-m="${m}"]`); await check(`type ${m}`); }
  const yrs = await p.$$eval('#cf-year option', o => o.map(x => x.value));
  for (const y of yrs) { await p.select('#cf-year', y); await check(`year ${y}`); }
  await p.select('#cf-sort', 'old'); await check('sort old'); await p.select('#cf-sort', 'new');
  // combination with no result, then clear
  await p.click('#cf-blocks button[data-k="gpu"]'); await p.select('#cf-year', '2012');
  const empty = await p.$('#cf-reset2'); if (!empty) bad('empty state missing'); else await empty.click();
  // timeline: a year column, then a dot
  await p.evaluate(() => { const g = document.querySelector('#cf-tl .yr[data-y="2025"]'); g.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  const n25 = await p.$eval('#cf-cards', e => e.querySelectorAll('.cf-card').length);
  await p.evaluate(() => { const d = document.querySelector('#cf-tl .dot[data-id="knight-2012-08"]'); d.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  const shown = await p.$('#cf-c-knight-2012-08'); if (!shown) bad('dot did not open its card');
  await check(`timeline (2025 had ${n25})`);
  // tag on a card, quotes, jump links
  await p.evaluate(() => document.querySelector('#cf-cards .cf-tags button').click());
  await p.evaluate(() => document.querySelectorAll('#cf-cards details').forEach(d => d.open = true));
  await check('quotes open');
  await p.click('#cf-reset');
  await p.evaluate(() => document.querySelector('#cf-an a.cf-jump').click());
  await p.evaluate(() => document.querySelector('#cf-def a[data-tab]') && 0);
  await check('jump');
  await p.evaluate(() => document.querySelectorAll('#cf-cards details').forEach(d => d.open = false));
  await p.evaluate(() => document.getElementById('cf-blocks').scrollIntoView());
  await p.screenshot({ path: path.join(shots, `cases_${w}_cards.png`) });
  const tl = await p.$('#cf-tl'); await tl.screenshot({ path: path.join(shots, `cases_${w}_timeline.png`) });
  const c1 = await p.$('#cf-c-aws-2025-dwfm'); await c1.screenshot({ path: path.join(shots, `cases_${w}_card.png`) });
  if (errs.length) bad(`${w}: page errors ${errs.slice(0, 3).join(' | ')}`);
  await p.close();
}
await browser.close();
console.log(fail ? `cases check: ${fail} failures` : 'cases check: ok');
process.exit(fail ? 1 : 0);
