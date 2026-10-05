// Exercise every control of the Reading and Further reading tabs at 390 px dark and 920 px light.
// Reports page errors, NaN/undefined/Infinity in visible text, sideways page scroll, elements wider than the viewport;
// steps every animation in every mode (buttons of its "-seg" bar) to its end, moves every slider, opens every <details>,
// and screenshots each animation card at its last step.
// Run from the repo root: node technical_knowledge_base/agents_and_retrieval/topic_protocols/src/read/check_read.mjs [shots dir]
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
const bad = s => /\bNaN\b|\bundefined\b|Infinity|\[object|\(missing/.test(s);
let problems = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.evaluateOnNewDocument(() => { try { localStorage.clear() } catch (e) {} });
  await p.goto('file://' + page);
  await p.click('button[data-t=t-read]'); await sleep(300);
  const textOf = sel => p.$$eval(sel, es => es.map(e => e.innerText).join(' '));
  const cards = await p.$$eval('#t-read .an-ctl', es => es.map(e => e.id.replace(/-ctl$/, '')));
  for (const c of cards) {
    const modes = await p.$$eval('#' + c + '-seg button', es => es.map(e => e.dataset.m));
    for (const m of (modes.length ? modes : [null])) {
      if (m) { await p.click('#' + c + '-seg button[data-m="' + m + '"]'); await sleep(80); }
      await p.click('#' + c + '-ctl-p'); await p.click('#' + c + '-ctl-p'); // play then pause
      const n = await p.$eval('#' + c + '-ctl-s', e => +e.max);
      for (let i = 0; i <= n; i++) {
        await p.$eval('#' + c + '-ctl-s', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, i);
        const t = await textOf('#' + c);
        if (bad(t)) { console.log(scheme, c, m, 'step', i, 'BAD TEXT'); problems++; }
      }
      await p.click('#' + c + '-ctl-b'); await p.click('#' + c + '-ctl-f');
      await p.select('#' + c + '-ctl-v', '2');
      const el = await p.$('#' + c); await el.scrollIntoView(); await sleep(150);
      await el.screenshot({ path: path.join(shots, `${c}_${m || 'x'}_${width}_${scheme}.png`) });
    }
  }
  // sliders of the window calculator
  for (const id of ['rd-bdp-rtt', 'rd-bdp-win', 'rd-bdp-link']) {
    const max = await p.$eval('#' + id, e => +e.max);
    for (let v = 0; v <= max; v++) {
      await p.$eval('#' + id, (e, x) => { e.value = x; e.dispatchEvent(new Event('input')) }, v);
      const t = await textOf('#rd-bdp-out');
      if (bad(t)) { console.log(scheme, id, v, 'BAD', t); problems++; }
    }
  }
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true));
  // whole-tab text check (pre and code hold recorded program output, which may legitimately say anything)
  const vis = await p.$eval('#t-read', e => { const c = e.cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove()); return c.innerText });
  if (bad(vis)) { console.log(scheme, 'BAD visible text in Reading'); problems++; }
  const pres = await p.$$eval('#t-read pre', es => es.filter(e => /\(missing/.test(e.textContent)).length);
  if (pres) { console.log(scheme, pres, 'missing recordings'); problems++; }
  const side = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const wide = await p.evaluate(w => [...document.querySelectorAll('#t-read *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && !e.closest('.tw,pre,.hmwrap,.nav') }).map(e => e.tagName + '.' + e.className).slice(0, 5), width);
  if (side > 0 || wide.length) { console.log(scheme, 'sideways', side, wide); problems++; }
  await p.screenshot({ path: path.join(shots, `read_full_${width}_${scheme}.png`), fullPage: false });
  // Further reading
  await p.click('button[data-t=t-more]'); await sleep(200);
  const mt = await textOf('#t-more'); if (bad(mt)) { console.log(scheme, 'BAD more'); problems++; }
  const side2 = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (side2 > 0) { console.log(scheme, 'sideways in more', side2); problems++; }
  await p.screenshot({ path: path.join(shots, `more_${width}_${scheme}.png`), fullPage: true });
  // tab links from the Reading
  await p.click('button[data-t=t-read]'); await sleep(100);
  for (const t of ['t-wire', 't-fail', 't-atlas']) {
    await p.$eval('#t-read a[data-tab="' + t + '"]', a => a.click()); await sleep(100);
    const shown = await p.$eval('#' + t, e => !e.hidden); if (!shown) { console.log('tab link failed', t); problems++; }
    await p.click('button[data-t=t-read]'); await sleep(50);
  }
  if (errs.length) { console.log(scheme, 'errors', errs); problems += errs.length; }
  console.log(scheme, width, 'cards', cards.length, 'done');
  await p.close();
}
await b.close();
console.log('problems', problems);
