// Part 3 UI check: open every rs tab at 390 dark and 920 light, click every control, step every animation,
// and report script errors, NaN/undefined in visible text, sideways scroll and the widest offenders.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_programming_languages/rust/src/rs/check_ui.mjs
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../..');
const require = createRequire(path.join(root, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const page_file = 'file://' + path.resolve(here, '../../index.html');
const TABS = ['t-rs-read', 't-rs-async', 't-rs-bench', 't-rs-cli'];
const shots = path.resolve(here, '../../.shots');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
let bad = 0;
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(page_file, { waitUntil: 'load' });
  for (const t of TABS) {
    await p.evaluate(t => window.SHOW_TAB(t), t);
    await new Promise(r => setTimeout(r, 300));
    // click every segmented button, step every animation forward to the end and back
    const n = await p.evaluate(async t => {
      const tab = document.getElementById(t); let c = 0;
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const seg of tab.querySelectorAll('.seg')) for (const btn of seg.querySelectorAll('button')) {
        btn.click(); c++; await sleep(30);
        for (const f of tab.querySelectorAll('button[id$="-f"]')) for (let i = 0; i < 70; i++) { f.click(); c++; }
        for (const s of tab.querySelectorAll('input[type=range]')) { s.value = s.max; s.dispatchEvent(new Event('input')); s.value = 0; s.dispatchEvent(new Event('input')); }
        for (const bk of tab.querySelectorAll('button[id$="-b"]')) bk.click();
      }
      for (const pl of tab.querySelectorAll('.an-play')) { pl.click(); await sleep(200); pl.click(); c++; }
      for (const d of tab.querySelectorAll('details')) { d.open = true; c++; }
      // CLI replay: guess every step
      const next = document.getElementById('rs-cli-next');
      if (t === 't-rs-cli') for (let i = 0; i < 12; i++) {
        const g = tab.querySelector('#rs-cli-guess button[data-c="0"]'); if (g) g.click(); next.click(); c += 2; await sleep(20);
      }
      for (const sel of tab.querySelectorAll('select')) { sel.value = '2'; sel.dispatchEvent(new Event('change')); }
      return c;
    }, t);
    await new Promise(r => setTimeout(r, 200));
    const r = await p.evaluate(t => {
      const tab = document.getElementById(t), W = document.documentElement.clientWidth;
      const txt = tab.innerText;
      const wide = [...tab.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && !e.closest('.tw,.hmwrap,pre,.rs-src,svg,.nav'); })
        .slice(0, 5).map(e => e.tagName + '.' + e.className + '#' + e.id + ' ' + Math.round(e.getBoundingClientRect().right));
      return { sideways: document.documentElement.scrollWidth > W, nan: /\bNaN\b|undefined/.test(txt), wide };
    }, t);
    await p.screenshot({ path: path.join(shots, `rs-${t}-${scheme}-${w}.png`), fullPage: t !== 't-rs-read' });
    const ok = !errs.length && !r.sideways && !r.nan;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${t} ${scheme} ${w}: ${n} actions, errors ${JSON.stringify(errs)}, sideways ${r.sideways}, NaN/undefined ${r.nan}${r.wide.length ? ', wide ' + r.wide.join(' | ') : ''}`);
    errs.length = 0;
  }
  await p.close();
}
await b.close();
console.log(bad ? `check_ui: ${bad} failures` : 'check_ui: all ok');
