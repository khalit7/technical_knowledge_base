// Exercise every Reading and Further reading control at 390 dark and 920 light; report errors, NaN/undefined, sideways scroll,
// elements wider than the viewport; check the page's JS numbers against read/recompute_out.json; save screenshots.
// usage (from src/): node read/check_read.mjs
// (2026-11-09: the reduced-motion emulation below keeps the Fig. 1 stage still while the tab is scanned; autoplay is checked by src/check_stages.mjs)
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
  // (2026-11-09) the life stepper is now the 3D stage Fig. 1 and the error-bar widget a static table; src/check_stages.mjs drives the stage
  // numbers in the JS against recompute.py
  const life = await p.evaluate(() => ({ R: RD_LIFE.R, pace: RD_LIFE.pace }));
  for (const k of ['mmlu', 'tbs']) { const js = life.R[k === 'mmlu' ? 'then' : 'now']; ref[k].forEach((r, i) => {
    for (const f of ['days', 'score', 'headroom', 'gain', 'per30']) if (r[f] !== null && !near(js[i][f], r[f])) { probs.push(`life ${k}[${i}].${f} js ${js[i][f]} py ${r[f]}`) } }) }
  if (!near(life.pace, ref.pace_ratio, 0.051)) probs.push('pace ' + life.pace + ' vs ' + ref.pace_ratio);
  // error bars: the static table in Sampling against recompute.py (standard error, 95% half-width, unpaired gap, one item)
  const tab = await p.$$eval('#t-read table.rd-se tbody tr', rs => rs.map(r => [...r.cells].map(c => c.textContent.replace(/[±,\u00b1%]/g, ''))));
  const want = { 'AIME (one year)': 'AIME (one year)', 'GPQA Diamond': 'GPQA Diamond', 'SWE-bench Verified': 'SWE-bench Verified', 'HLE': 'HLE' };
  for (const [k, name] of Object.entries(want)) { const v = ref.err[k], r = tab.find(x => x[0] === name);
    if (!r) { probs.push('err table: no row ' + name); continue }
    const got = [+r[1], +r[2] / 100, +r[3], +r[4], +r[5], +r[6]], exp = [v.n, v.p, v.se_pts, v.ci95_half, v.diff95_unpaired, v.item_pts];
    got.forEach((g, i) => { if (!near(g, exp[i], 0.006)) probs.push(`err table ${name} col ${i + 1}: ${g} vs ${exp[i]}`) }) }
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
