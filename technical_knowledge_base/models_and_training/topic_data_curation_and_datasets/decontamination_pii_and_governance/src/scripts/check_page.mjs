// Click every control of every tab of the Decontamination, PII and data governance page at 390 px dark and 920 px light;
// fail on script errors, "NaN" or "undefined" in visible text, and sideways scroll. Screenshots of each card go to <outdir>.
// usage: node src/scripts/check_page.mjs <page index.html> <screenshot folder>
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, outdir] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0, clicks = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  const problems = [];
  for (const tab of ['t-read', 't-dgcc', 't-more']) {
    await p.click(`button[data-t=${tab}]`); await sleep(300);
    const check = async (what) => {
      const r = await p.evaluate(t => { const x = document.getElementById(t).innerText;
        return { nan: /\bNaN\b/.test(x), und: /\bundefined\b/.test(x), side: document.documentElement.scrollWidth > innerWidth,
          err: (d => d && !d.hidden ? d.textContent : '')(document.getElementById('jsErr')) } }, tab);
      if (r.nan || r.und || r.side || r.err) problems.push(tab + ' ' + what + ' ' + JSON.stringify(r));
    };
    await check('initial');
    const sel = `#${tab} button:not([data-t])`;
    const n = await p.$$eval(sel, bs => bs.length);
    for (let i = 0; i < n; i++) {
      const ok = await p.evaluate((s, i) => { const x = document.querySelectorAll(s)[i]; if (!x || x.offsetParent === null) return false; x.click(); return true }, sel, i);
      if (ok) { clicks++; await sleep(15); await check('button ' + i); }
    }
    for (const id of await p.$$eval(`#${tab} select`, s => s.map(x => x.id))) {
      const k = await p.$eval('#' + id, s => s.options.length);
      for (let o = 0; o < k; o++) {
        await p.evaluate((id, o) => { const s = document.getElementById(id); s.selectedIndex = o; s.dispatchEvent(new Event('change')); s.dispatchEvent(new Event('input')) }, id, o);
        clicks++; await check('select ' + id + ' ' + o);
      }
    }
    for (const [id, mn, mx, st] of await p.$$eval(`#${tab} input[type=range]`, s => s.map(x => [x.id, +x.min, +x.max, +(x.step || 1)]))) {
      for (let v = mn; v <= mx + 1e-9; v += Math.max(st, (mx - mn) / 10)) {
        await p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input')) }, id, v);
        clicks++; await check('range ' + id + ' ' + v);
      }
    }
    // click checker items and pairs
    if (tab === 't-dgcc') {
      for (const bsel of ['#cc-list button', '.cc-pair']) {
        const m = Math.min(8, await p.$$eval(bsel, x => x.length));
        for (let i = 0; i < m; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i] && document.querySelectorAll(s)[i].click(), bsel, i); clicks++; await check(bsel + i); }
      }
    }
    await p.evaluate(t => document.querySelectorAll(`#${t} details`).forEach(d => d.open = true), tab);
    await check('opened');
    await sleep(500);
    for (const [k, el] of (await p.$$(`#${tab} .rd-card, #${tab} .card, #${tab} .pv-chain`)).entries()) {
      try { await el.screenshot({ path: path.join(outdir, `${tab}-${scheme}-${width}-${k}.png`) }); } catch (e) {}
    }
  }
  if (errs.length) problems.push('errors ' + errs.join(' | '));
  console.log(scheme, width, problems.length ? 'PROBLEMS\n' + problems.slice(0, 20).join('\n') : 'ok');
  bad += problems.length;
  await p.close();
}
await b.close();
console.log('controls exercised', clicks, bad ? 'FAIL' : 'PASS');
process.exit(bad ? 1 : 0);
