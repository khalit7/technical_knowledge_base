// Exercise every control of the Reading and Further reading tabs at 390 px dark and 920 px light.
// Reports page errors, NaN/undefined/Infinity in visible text, sideways page scroll, and elements wider than the viewport;
// steps every animation in every mode to its end and screenshots each card at its last step.
// Writes read/check_out.json (the SQL animation's result and the final counters, compared by recompute.py).
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_databases/src/read/check_read.mjs [shots dir]
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
const out = { runs: [] };
const bad = s => /\bNaN\b|\bundefined\b|Infinity|\[object/.test(s);
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
  const run = { scheme, width, cards: {} };
  const cards = await p.$$eval('#t-read .an-ctl', es => es.map(e => e.id.replace(/-ctl$/, '')));
  for (const c of cards) {
    const modes = await p.$$eval('#' + c + '-mode button', es => es.map(e => e.dataset.m)).catch(() => []);
    for (const m of (modes.length ? modes : [null])) {
      if (m) { await p.evaluate((c, m) => document.querySelector('#' + c + '-mode button[data-m="' + m + '"]').click(), c, m); await sleep(80) }
      const card = await p.$('#' + c + '-card');
      await p.evaluate(e => e.scrollIntoView({ block: 'center' }), card); await sleep(120);
      // pause, rewind to 0, then step to the end checking the text at every step
      await p.evaluate(c => { const pl = document.getElementById(c + '-ctl-p'); if (/Pause/.test(pl.textContent)) pl.click(); const s = document.getElementById(c + '-ctl-s'); s.value = 0; s.dispatchEvent(new Event('input')) }, c);
      const n = await p.$eval('#' + c + '-ctl-s', e => +e.max + 1);
      for (let i = 0; i < n; i++) {
        const txt = await p.$eval('#' + c + '-card', e => e.innerText);
        if (bad(txt)) probs.push(`${c}/${m} step ${i}: ${txt.match(/.{0,40}(NaN|undefined|Infinity|\[object).{0,40}/)?.[0]}`);
        if (i < n - 1) { await p.click('#' + c + '-ctl-f'); await sleep(30) }
      }
      run.cards[c + (m ? '/' + m : '')] = await p.$eval('#' + c + '-card', e => [...e.querySelectorAll('.an-cnt .stat')].map(s => s.querySelector('.k').textContent + ': ' + s.querySelector('.v').textContent).join(' | '));
      await card.screenshot({ path: `${shots}/${c}${m ? '-' + m : ''}-${scheme}-${width}.png` });
      // controls: back, play/pause, scrub, speed
      await p.click('#' + c + '-ctl-b'); await p.click('#' + c + '-ctl-p'); await sleep(200); await p.click('#' + c + '-ctl-p');
      await p.$eval('#' + c + '-ctl-s', e => { e.value = 1; e.dispatchEvent(new Event('input')) });
      await p.select('#' + c + '-ctl-v', '2');
    }
  }
  // schema rows
  const rows = await p.$$('#rd-schema tr[data-r]');
  for (const r of rows) { await r.click(); await sleep(15) }
  run.schemaCap = await p.$eval('#rd-schema-cap', e => e.textContent);
  await (await p.$('#rd-schema')).screenshot({ path: `${shots}/schema-${scheme}-${width}.png` });
  run.sql = await p.evaluate(() => window.RD_SQL_RESULT);
  // whole-tab text, widths
  const t = await p.$eval('#t-read', e => e.innerText);
  if (bad(t)) probs.push('reading text: ' + t.match(/.{0,40}(NaN|undefined|Infinity|\[object).{0,40}/)?.[0]);
  run.sideways = await p.evaluate(() => document.scrollingElement.scrollWidth > innerWidth + 1);
  run.wide = await p.$$eval('#t-read *', es => es.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !e.closest('.tw,.tbls,pre,.hmwrap,.nav') }).map(e => e.tagName + '#' + e.id + '.' + e.className).slice(0, 8));
  await p.screenshot({ path: `${shots}/one-${scheme}-${width}.png`, clip: await p.$eval('#rd-one', e => { const r = e.getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: Math.min(1800, r.height) } }) });
  // nav links and tab links inside the reading tab
  const tabLinks = await p.$$eval('#t-read a[data-tab]', es => es.map(e => e.dataset.tab));
  run.tabLinks = [...new Set(tabLinks)];
  // further reading
  await p.click('button[data-t=t-more]'); await sleep(200);
  const mt = await p.$eval('#t-more', e => e.innerText);
  if (bad(mt)) probs.push('further reading text');
  run.moreLinks = await p.$$eval('#t-more a', es => es.length);
  run.moreBadLinks = await p.$$eval('#t-more a:not([data-tab])', es => es.filter(e => e.target !== '_blank' || !/noopener/.test(e.rel)).map(e => e.href));
  run.sidewaysMore = await p.evaluate(() => document.scrollingElement.scrollWidth > innerWidth + 1);
  await p.screenshot({ path: `${shots}/more-${scheme}-${width}.png`, fullPage: true });
  run.errors = errs; run.problems = probs;
  out.runs.push(run);
  console.log(scheme, width, 'errors', errs.length, 'problems', probs.length, 'sideways', run.sideways, run.sidewaysMore, 'wide', run.wide.length);
  errs.concat(probs).slice(0, 10).forEach(e => console.log('  ', e));
  if (run.wide.length) console.log('  wide:', run.wide.join(', '));
  await p.close();
}
fs.writeFileSync(path.join(here, 'check_out.json'), JSON.stringify(out, null, 1));
await b.close();
