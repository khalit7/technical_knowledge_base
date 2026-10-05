// Exercise every control of the Reading and Further reading tabs at 390 px dark and 920 px light.
// Reports page errors, NaN/undefined/Infinity in visible text, sideways page scroll, and elements wider than the viewport;
// steps every animation in every mode (the buttons of its "-seg" bar) to its end, clicks every code-panel language,
// and screenshots each animation card at its last step and the whole tab.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_programming_languages/src/read/check_read.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../..');
const require = createRequire(path.join(root, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../../index.html');
const shots = process.argv[2] || path.resolve(here, '../../.shots/read');
fs.mkdirSync(shots, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const bad = s => /\bNaN\b|\bundefined\b(?! behaviou?r)|Infinity|\[object/.test(s);
const report = [];
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [], probs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.evaluateOnNewDocument(() => { try { localStorage.clear() } catch (e) {} });
  await p.goto('file://' + page);
  await p.click('button[data-t=t-read]');
  await sleep(300);
  // text that legitimately contains "undefined" or "NaN" (real program output and prose about them) is inside pre.cd or code
  const visibleBad = async (sel) => p.$$eval(sel, (es) => es.map(e => { const c = e.cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove()); return c.textContent }).join(' '));
  const cards = await p.$$eval('#t-read .an-ctl', es => es.map(e => e.id.replace(/-ctl$/, '')));
  for (const c of cards) {
    const modes = await p.$$eval('#' + c + '-seg button', es => es.map(e => e.dataset.m)).catch(() => []);
    for (const m of (modes.length ? modes : [null])) {
      if (m) { await p.evaluate((c, m) => document.querySelector('#' + c + '-seg button[data-m="' + m + '"]').click(), c, m); await sleep(80) }
      const card = await p.$('#' + c + '-card');
      await p.evaluate(e => e.scrollIntoView({ block: 'center' }), card); await sleep(150);
      await p.evaluate(c => { const pl = document.getElementById(c + '-ctl-p'); if (/Pause/.test(pl.textContent)) pl.click(); const s = document.getElementById(c + '-ctl-s'); s.value = 0; s.dispatchEvent(new Event('input')) }, c);
      const n = await p.$eval('#' + c + '-ctl-s', s => +s.max + 1);
      for (let i = 0; i < n; i++) {
        const t = await visibleBad('#' + c + '-card');
        if (bad(t)) probs.push(`${c}/${m} step ${i}: ${t.match(/.{0,40}(NaN|undefined|Infinity|\[object).{0,40}/)[0]}`);
        if (i < n - 1) { await p.click('#' + c + '-ctl-f'); await sleep(40) }
      }
      await card.screenshot({ path: path.join(shots, `${scheme}-${width}-${c}-${m || 'x'}.png`) });
    }
    // also exercise play/pause, back, speed
    await p.click('#' + c + '-ctl-b'); await p.select('#' + c + '-ctl-v', '2'); await p.click('#' + c + '-ctl-p'); await sleep(150); await p.click('#' + c + '-ctl-p');
  }
  // every code panel, every language
  const quads = await p.$$eval('#t-read .quad', es => es.length);
  for (let q = 0; q < quads; q++) {
    const n = await p.evaluate(q => document.querySelectorAll('#t-read .quad')[q].querySelectorAll('.seg button').length, q);
    for (let i = 0; i < n; i++) await p.evaluate((q, i) => document.querySelectorAll('#t-read .quad')[q].querySelectorAll('.seg button')[i].click(), q, i);
  }
  // other segmented controls in the reading (repo chart etc.)
  const segs = await p.$$eval('#t-read .seg:not(.quad .seg)', es => es.map(e => e.id).filter(Boolean));
  for (const s of segs) {
    const k = await p.$$eval('#' + s + ' button', es => es.length);
    for (let i = 0; i < k; i++) await p.evaluate((s, i) => document.querySelectorAll('#' + s + ' button')[i].click(), s, i);
  }
  const txt = await visibleBad('#t-read');
  if (bad(txt)) probs.push('reading text: ' + txt.match(/.{0,50}(NaN|undefined|Infinity|\[object).{0,50}/)[0]);
  const sw = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  if (sw[0] > sw[1] + 1) probs.push('sideways scroll ' + sw.join('>'));
  const wide = await p.evaluate(() => { const W = innerWidth; return [...document.querySelectorAll('#t-read *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && !e.closest('pre,.tw,.hmwrap,.nav,.seg,.stage') }).slice(0, 5).map(e => e.tagName + '.' + e.className + '#' + e.id) });
  if (wide.length) probs.push('wider than viewport: ' + wide.join(', '));
  await p.screenshot({ path: path.join(shots, `${scheme}-${width}-read-top.png`) });
  // further reading tab
  await p.click('button[data-t=t-more]'); await sleep(200);
  const mt = await visibleBad('#t-more'); if (bad(mt)) probs.push('more tab text');
  await p.screenshot({ path: path.join(shots, `${scheme}-${width}-more.png`), fullPage: false });
  report.push({ scheme, width, errs, probs });
  await p.close();
}
await b.close();
console.log(JSON.stringify(report, null, 1));
