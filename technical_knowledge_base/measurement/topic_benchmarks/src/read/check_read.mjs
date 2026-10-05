// Exercise every Reading and Further reading control at 390 dark and 920 light; report errors, NaN/undefined, sideways scroll,
// elements wider than the viewport; check the page's JS numbers against read/recompute_out.json; save screenshots.
// usage (from src/): node read/check_read.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = path.resolve(here, '../../index.html');
const shots = path.resolve(here, '../../.shots'); fs.mkdirSync(shots, { recursive: true });
const ref = JSON.parse(fs.readFileSync(path.join(here, 'recompute_out.json'), 'utf8'));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
const near = (a, b, tol = 0.011) => Math.abs(a - b) <= tol;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file); await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await p.reload(); await p.click('button[data-t=t-read]'); await new Promise(r => setTimeout(r, 300));
  const probs = [];
  const scan = async (label) => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-read'); const txt = t.innerText;
      const wide = [...t.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && e.offsetParent && !e.closest('.nav') && !e.closest('.tw')).slice(0, 5).map(e => e.tagName + '.' + e.className + ' ' + (e.textContent || '').slice(0, 40));
      return { nan: /NaN|undefined|Infinity/.test(txt), side: document.documentElement.scrollWidth > innerWidth, wide };
    });
    if (r.nan || r.side || r.wide.length) probs.push(label + ' ' + JSON.stringify(r));
  };
  await scan('initial');
  // life animation: both modes, every step
  for (const m of ['then', 'now']) {
    await p.click(`#rd-life-mode button[data-m=${m}]`);
    for (let i = 0; i < 5; i++) {
      await p.evaluate(i => { const s = document.getElementById('rd-life-ctl-s'); s.value = i; s.dispatchEvent(new Event('input')) }, i);
      await scan(`life ${m} ${i}`);
      if (i === 4 || (m === 'then' && i === 1)) await (await p.$('#rd-life-card')).screenshot({ path: `${shots}/rd-life-${m}-${i}-${scheme}-${width}.png` });
    }
    for (const c of ['p', 'p', 'f', 'b']) await p.click('#rd-life-ctl-' + c);
    await p.select('#rd-life-ctl-v', '2');
  }
  // numbers in the JS against recompute.py
  const life = await p.evaluate(() => ({ R: RD_LIFE.R, pace: RD_LIFE.pace }));
  for (const k of ['mmlu', 'tbs']) { const js = life.R[k === 'mmlu' ? 'then' : 'now']; ref[k].forEach((r, i) => {
    for (const f of ['days', 'score', 'headroom', 'gain', 'per30']) if (r[f] !== null && !near(js[i][f], r[f])) { probs.push(`life ${k}[${i}].${f} js ${js[i][f]} py ${r[f]}`) } }) }
  if (!near(life.pace, ref.pace_ratio, 0.051)) probs.push('pace ' + life.pace + ' vs ' + ref.pace_ratio);
  // error bars: each preset at its reference rate
  for (const [k, v] of Object.entries(ref.err)) {
    const s = await p.evaluate((n, q) => RD_ERR.set(n, q), v.n, v.p);
    if (!near(s.se, v.se_pts) || !near(s.half, v.ci95_half) || !near(s.diff, v.diff95_unpaired) || !near(s.item, v.item_pts)) probs.push('err ' + k + ' ' + JSON.stringify(s));
  }
  // error widget controls
  for (const n of ['30', '198', '500', '2500']) {
    await p.click(`#rd-err-n button[data-m="${n}"]`);
    await p.evaluate(() => { const s = document.getElementById('rd-err-p'); s.value = 37; s.dispatchEvent(new Event('input')) });
    await p.click('#rd-err-run1'); await p.click('#rd-err-run20');
    await scan('err ' + n);
    if (n === '30' || n === '500') await (await p.$('#rd-err-card')).screenshot({ path: `${shots}/rd-err-${n}-${scheme}-${width}.png` });
    await p.click('#rd-err-clr');
  }
  // mistakes, nav links, tab links
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true)); await scan('details open');
  for (const a of await p.$$('#rd-nav a')) { await a.click(); }
  const tabs = await p.$$eval('#t-read a[data-tab]', as => [...new Set(as.map(a => a.dataset.tab))]);
  for (const t of tabs) { await p.click(`#t-read a[data-tab="${t}"]`); await p.click('button[data-t=t-read]'); }
  // further reading
  await p.click('button[data-t=t-more]'); await new Promise(r => setTimeout(r, 200));
  const more = await p.evaluate(() => { const t = document.getElementById('t-more'); return { nan: /NaN|undefined/.test(t.innerText), side: document.documentElement.scrollWidth > innerWidth,
    badLinks: [...t.querySelectorAll('a')].filter(a => !a.dataset.tab && !(a.target === '_blank' && /noopener/.test(a.rel))).length, n: t.querySelectorAll('a').length } });
  if (more.nan || more.side || more.badLinks) probs.push('more ' + JSON.stringify(more));
  for (const t of await p.$$eval('#t-more a[data-tab]', as => as.map(a => a.dataset.tab))) { await p.click('button[data-t=t-more]'); await p.click(`#t-more a[data-tab="${t}"]`) }
  const linkCheck = await p.evaluate(() => [...document.querySelectorAll('#t-read a, #t-more a')].filter(a => !a.dataset.tab && !a.getAttribute('href').startsWith('#') && !(a.target === '_blank' && /noopener/.test(a.rel))).length);
  if (linkCheck) probs.push('links without target/rel: ' + linkCheck);
  await p.click('button[data-t=t-read]'); await p.evaluate(() => scrollTo(0, 0));
  await p.screenshot({ path: `${shots}/rd-top-${scheme}-${width}.png` });
  console.log(scheme, width, 'errors', errs, 'problems', probs.length ? probs : 'none', 'further-reading links', more.n);
  if (errs.length || probs.length) bad = 1;
  await p.close();
}
await b.close();
process.exit(bad);
