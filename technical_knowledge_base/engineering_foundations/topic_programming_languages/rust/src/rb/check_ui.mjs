// Puppeteer check of Part 2 (rb): every control at 390 px dark and 920 px light; no errors, NaN, undefined or '?' numbers, no sideways scroll.
// usage (from the repo root): OUT=<dir for screenshots> node technical_knowledge_base/engineering_foundations/topic_programming_languages/rust/src/rb/check_ui.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../../index.html');
const OUT = process.env.OUT || '/tmp';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
const b = await puppeteer.launch({ headless: 'shell' });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page);
  const scan = async (label) => {
    const r = await p.evaluate(() => {
      const t = [...document.querySelectorAll('[id^="t-rb-"]')].filter(e => !e.hidden).map(e => e.innerText).join('\n');
      const issues = [];
      if (/\bNaN\b/.test(t)) issues.push('NaN'); if (/\bundefined\b/.test(t)) issues.push('undefined');
      if (/(^|\s)\?( ms| ns| s\b|x\b|%)|\t\?(\t|$)|^\?$/m.test(t)) issues.push('? number');
      if (/missing anchor|\[\[/.test(t)) issues.push('unexpanded marker');
      const sw = document.documentElement.scrollWidth > innerWidth;
      const box = document.getElementById('jsErr'); const eb = box && !box.hidden ? box.textContent : '';
      return { issues, sw, eb };
    });
    const problems = [...r.issues, ...(r.sw ? ['sideways scroll'] : []), ...(r.eb ? ['errbox: ' + r.eb] : []), ...errs.splice(0)];
    if (problems.length) { bad++; console.log('FAIL', scheme, width, label, problems.join('; ')) }
  };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) await el.screenshot({ path: `${OUT}/rb-${name}-${scheme}-${width}.png` }) };
  // Reading
  await p.evaluate(() => window.SHOW_TAB('t-rb-read')); await sleep(300); await scan('read');
  for (const m of ['serial', 'held', 'detached', 'ft']) {
    await p.click(`#rb-gil-mode button[data-m="${m}"]`); await sleep(100);
    for (const s of [0, 20, 48]) { await p.evaluate(v => { const r = document.getElementById('rb-gil-ctl-s'); r.value = v; r.dispatchEvent(new Event('input')) }, s); await sleep(50); await scan('gil ' + m + ' ' + s) }
    await p.click('#rb-gil-ctl-b'); await p.click('#rb-gil-ctl-f'); await scan('gil step ' + m);
    await shot('#rb-gil-card', 'gil-' + m);
  }
  await p.select('#rb-gil-ctl-v', '2');
  const rvs = await p.$$('#t-rb-read .rb-rv');
  for (const r of rvs) { await r.evaluate(e => e.click()); } await sleep(100); await scan('reveals open');
  await p.evaluate(() => document.querySelectorAll('#t-rb-read details').forEach(d => d.open = true)); await scan('details');
  await shot('#rb-ph-card', 'phases'); await shot('#rb-alts', 'alts'); await shot('#rb-s0', 's0');
  // Ladder
  await p.evaluate(() => window.SHOW_TAB('t-rb-ladder')); await sleep(300); await scan('ladder');
  for (const s of ['python', 'percall', 'owned', 'borrowed', 'bytes', 'parallel']) {
    await p.click(`#rb-ld-seg button[data-m="${s}"]`); await sleep(60); await scan('ladder ' + s);
    for (const c of ['prev', 'python', 'parallel']) { await p.select('#rb-ld-cmp', c); await sleep(30); await scan('ladder cmp ' + c) }
  }
  await p.click('#rb-ld-log'); await sleep(50); await scan('ladder log');
  await p.click('#rb-ld-seg button[data-m="bytes"]'); await shot('#t-rb-ladder', 'ladder');
  // Crossing
  await p.evaluate(() => window.SHOW_TAB('t-rb-cross')); await sleep(300); await scan('cross');
  for (const m of ['sown', 'sref', 'fvec', 'fnp']) {
    await p.click(`#rb-cx-mode button[data-m="${m}"]`); await sleep(60);
    for (let s = 0; s < 8; s++) { await p.evaluate(v => { const r = document.getElementById('rb-cx-ctl-s'); r.value = v; r.dispatchEvent(new Event('input')) }, s); await sleep(30); await scan('cross ' + m + ' ' + s); if (s === 3 || s === 6) await shot('#rb-cx-card', `cross-${m}-${s}`) }
    await p.click('#rb-cx-ctl-p'); await sleep(150); await p.click('#rb-cx-ctl-p'); await scan('cross play ' + m);
  }
  // tab links inside the part
  const links = await p.evaluate(() => [...document.querySelectorAll('[id^="t-rb-"] a[data-tab]')].map(a => a.dataset.tab));
  const missing = await p.evaluate(ls => ls.filter(t => !document.getElementById(t)), [...new Set(links)]);
  if (missing.length) { bad++; console.log('FAIL missing tab targets', missing) }
  await p.close();
}
await b.close();
console.log(bad ? `rb check: ${bad} failures` : 'rb check: all controls ok at 390 dark and 920 light');
