// Check the Reading (t-read) and Further reading (t-more) tabs at 390 px dark and 920 px light (rebuilt 2026-10-24 as a map):
// no script errors, no "NaN" or "undefined" in the text, no sideways scroll, the hero drawn with one link per stage and band,
// every tab link opens its tab, every outside link opens in a new tab over https. Screenshots of the hero go to the folder given.
// usage (from the repository root): node <page>/src/read/check_tab.mjs <page>/index.html <screenshot folder>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, outdir] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
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
      return { nan: /\bNaN\b/.test(t), und: /\bundefined\b/.test(t), side: document.documentElement.scrollWidth > innerWidth,
        err: (d => d && !d.hidden ? d.textContent : '')(document.getElementById('jsErr')) };
    }, tab);
    if (r.nan || r.und || r.side || r.err) problems.push(what + ' ' + JSON.stringify(r));
  };
  await check('initial');
  const hero = await p.evaluate(() => { const s = document.querySelector('#rd-hero-svg svg'); return s ? { links: s.querySelectorAll('a').length, w: s.getBoundingClientRect().width } : null });
  if (!hero || hero.links !== 12) problems.push('hero ' + JSON.stringify(hero));
  await p.evaluate(() => document.querySelectorAll('#t-read details').forEach(d => d.open = true));
  await sleep(150);
  await check('details open');
  const el = await p.$('#rd-hero');
  await el.screenshot({ path: path.join(outdir, `rd-hero-${scheme}-${width}.png`) });
  const tl = await p.$$eval('#t-read a[data-tab], #t-more a[data-tab]', as => [...new Set(as.map(a => a.dataset.tab))]);
  for (const t of tl) {
    const src = await p.evaluate(t => { const a = document.querySelector('#t-read a[data-tab="' + t + '"]'); return a ? 't-read' : 't-more' }, t);
    await p.click('button[data-t=' + src + ']'); await sleep(40);
    await p.evaluate((t, src) => document.querySelector('#' + src + ' a[data-tab="' + t + '"]').click(), t, src);
    await sleep(80);
    if (!(await p.evaluate(t => !document.getElementById(t).hidden, t))) problems.push('tab link ' + t + ' did not open');
  }
  await p.click('button[data-t=t-more]'); await sleep(150);
  await check('more', 't-more');
  const links = await p.$$eval('#t-read a, #t-more a', as => as.map(a => [a.getAttribute('href'), a.getAttribute('target'), a.getAttribute('rel') || '', a.getAttribute('data-tab') || '']));
  for (const [h, t, r, dt] of links) if (!dt && !(h || '').startsWith('#') && (t !== '_blank' || !/noopener/.test(r) || !/^https:\/\//.test(h))) problems.push('bad link ' + h);
  if (errs.length) problems.push('console ' + errs.join(' | '));
  console.log(scheme, width, problems.length ? 'PROBLEMS\n  ' + problems.join('\n  ') : 'ok', '| hero links', hero && hero.links, '| links', links.length, '| tab links', tl.join(','));
  if (problems.length) bad = 1;
  await p.close();
}
await b.close();
process.exit(bad);
