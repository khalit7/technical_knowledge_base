// Click every control of the Reading (t-read) and Further reading (t-more) tabs at 390 px dark and 920 px light;
// fail on script errors, "NaN" or "undefined" in the text, and sideways scroll. Screenshots of every widget card go to
// the folder given. usage: node src/read/check_tab.mjs <page index.html> <screenshot folder>
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
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  await p.click('button[data-t=t-read]');
  await sleep(300);
  const problems = [];
  const check = async (what, tab = 't-read') => {
    const r = await p.evaluate(tab => {
      const t = document.getElementById(tab).innerText;
      return { nan: /\bNaN\b/.test(t), und: /\bundefined\b/.test(t), inf: /\bInfinity\b/.test(t), side: document.documentElement.scrollWidth > innerWidth,
        err: (d => d && !d.hidden ? d.textContent : '')(document.getElementById('jsErr')) };
    }, tab);
    if (r.nan || r.und || r.inf || r.side || r.err) problems.push(what + ' ' + JSON.stringify(r));
  };
  await check('initial');
  const n = await p.$$eval('#t-read .seg button', bs => bs.length);
  for (let i = 0; i < n; i++) { await p.evaluate(i => document.querySelectorAll('#t-read .seg button')[i].click(), i); await sleep(40); await check('seg ' + i); }
  const sels = await p.$$eval('#t-read select', s => s.map(x => x.id || ''));
  for (const id of sels) {
    if (!id) continue;
    const opts = await p.$eval('#' + id, s => s.options.length);
    for (let o = 0; o < opts; o++) {
      await p.evaluate((id, o) => { const s = document.getElementById(id); s.selectedIndex = o; s.dispatchEvent(new Event('change')) }, id, o);
      await check('select ' + id + ' ' + o);
    }
  }
  const ranges = await p.$$eval('#t-read input[type=range]', s => s.map(x => [x.id, +x.min, +x.max, +x.step || 1]));
  for (const [id, mn, mx, st] of ranges) {
    const steps = 12;
    for (let k = 0; k <= steps; k++) {
      const v = mn + (mx - mn) * k / steps;
      await p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input')) }, id, v);
      await check('range ' + id + ' ' + v);
    }
  }
  // reset widgets to defaults where they have them
  await p.evaluate(() => { document.getElementById('rd-bm-reset').click(); document.querySelector('#rd-lev-pre button').click(); const n = document.getElementById('rd-loop-n'); n.value = 3; n.dispatchEvent(new Event('input')) });
  // animation controls: every button of every .an-ctl, several times
  const na = await p.$$eval('#t-read .an-ctl button', bs => bs.length);
  for (let rep = 0; rep < 6; rep++) for (let i = 0; i < na; i++) {
    await p.evaluate(i => document.querySelectorAll('#t-read .an-ctl button')[i].click(), i); await sleep(20); await check('anim ' + i);
  }
  // scrub every animation to its last step
  await p.evaluate(() => document.querySelectorAll('#t-read .an-ctl input[type=range]').forEach(s => { s.value = s.max; s.dispatchEvent(new Event('input')) }));
  await sleep(900);
  await check('anim last');
  // predict-then-reveal: click every option
  const np = await p.$$eval('#t-read .pr .opts button', bs => bs.length);
  for (let i = 0; i < np; i++) { await p.evaluate(i => document.querySelectorAll('#t-read .pr .opts button')[i].click(), i); }
  await p.evaluate(() => document.querySelectorAll('#t-read details').forEach(d => d.open = true));
  await sleep(200);
  await check('opened');
  // the fates animation at its grouped step, both modes
  for (const m of ['on', 'off']) {
    await p.evaluate(m => { document.querySelector('#rd-fun-mode button[data-m=' + m + ']').click(); const s = document.querySelector('#rd-fun-ctl input'); s.value = 4; s.dispatchEvent(new Event('input')) }, m);
    await sleep(900);
    const card = await p.$('#rd-fun-card');
    await card.screenshot({ path: path.join(outdir, `rd-fun-${m}-${scheme}-${width}.png`) });
  }
  // screenshot each card
  const cards = await p.$$eval('#t-read .rd-card', cs => cs.map(c => c.id));
  for (const id of cards) { const el = await p.$('#' + id); await el.screenshot({ path: path.join(outdir, `${id}-${scheme}-${width}.png`) }); }
  // tab links inside the Reading tab switch tabs
  const tl = await p.$$eval('#t-read a[data-tab]', as => [...new Set(as.map(a => a.dataset.tab))]);
  for (const t of tl) {
    await p.evaluate(t => document.querySelector('#t-read a[data-tab="' + t + '"]').click(), t);
    await sleep(80);
    const shown = await p.evaluate(t => !document.getElementById(t).hidden, t);
    if (!shown) problems.push('tab link ' + t + ' did not open');
    await p.click('button[data-t=t-read]'); await sleep(40);
  }
  await p.click('button[data-t=t-more]'); await sleep(200);
  await check('more', 't-more');
  const links = await p.$$eval('#t-more a', as => as.map(a => [a.getAttribute('href'), a.target, a.rel, a.dataset.tab || '']));
  for (const [h, t, r, dt] of links) if (!dt && (t !== '_blank' || !/noopener/.test(r) || !/^https:\/\//.test(h))) problems.push('bad link ' + h);
  await p.screenshot({ path: path.join(outdir, `t-more-${scheme}-${width}.png`), fullPage: true });
  if (errs.length) problems.push('console ' + errs.join(' | '));
  console.log(scheme, width, problems.length ? 'PROBLEMS\n  ' + problems.join('\n  ') : 'ok', '| links in t-more', links.length, '| cards', cards.length, '| tab links', tl.join(','));
  if (problems.length) bad = 1;
  await p.close();
}
await b.close();
process.exit(bad);
