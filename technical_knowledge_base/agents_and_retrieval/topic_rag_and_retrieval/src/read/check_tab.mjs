// Check the Reading (t-read) and Further reading (t-more) tabs at 390 px dark and 920 px light (rebuilt 2026-10-24 as a map):
// no script errors, no "NaN" or "undefined" in the text, no sideways scroll, the hero's step list (Fig. 1, a 3D stage since 2026-11-06) with eight steps that link all eight child pages,
// every tab link opens its tab, every outside link opens in a new tab over https. Screenshots of the hero stage go to the folder given (its motion is checked by src/check_stages.mjs).
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
  const KIDS = ['3f85c17b0d0d81279079f614f382f2e7', '3c65c17b0d0d819899fde889e1e8b782', '3c65c17b0d0d81508f99e1fa78c2bb41', '3f85c17b0d0d81f29707c130b2ebcfb1', '3f85c17b0d0d813fba53fc883f8a2c8f', '3c65c17b0d0d8105a68cfb504ed4b0e8', '3f85c17b0d0d81e2bb4cdbb749e48a5a', '3f85c17b0d0d81aa9ba9c0ceac9e28c1'];
  const hero = await p.evaluate(K => { const l = document.getElementById('sx-hero'), c = document.querySelector('#stg-hero canvas'); if (!l || !c) return null; const hs = [...l.querySelectorAll('a')].map(a => a.href);
    return { steps: l.children.length, links: hs.length, kids: K.filter(k => hs.some(h => h.includes(k))).length, w: c.getBoundingClientRect().width } }, KIDS);
  if (!hero || hero.steps !== 8 || hero.kids !== 8 || !(hero.w > 200)) problems.push('hero ' + JSON.stringify(hero));
  await p.evaluate(() => document.querySelectorAll('#t-read details').forEach(d => d.open = true));
  await sleep(150);
  await check('details open');
  await p.$eval('#stg-hero', e => e.scrollIntoView({ block: 'center' })); await sleep(1500);
  const el = await p.$('#stg-hero');
  await el.screenshot({ path: path.join(outdir, `stg-hero-${scheme}-${width}.png`) });
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
