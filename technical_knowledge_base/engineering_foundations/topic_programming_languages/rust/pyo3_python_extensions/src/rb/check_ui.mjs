// Puppeteer check of every control on this page at 390 px dark and 920 px light, plus reduced motion:
// no errors, NaN, undefined or '?' numbers, no sideways scroll, nothing moves before the reader acts.
// usage (from anywhere in the repository): OUT=<dir for screenshots> node <this page>/src/rb/check_ui.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = execSync('git rev-parse --show-toplevel', { cwd: here }).toString().trim();
const require = createRequire(path.join(repo, 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../../index.html');
const OUT = process.env.OUT || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width, motion] of [['dark', 390, 'reduce'], ['light', 920, 'no-preference']]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: motion }]);
  await p.goto('file://' + page);
  await p.$eval('button[data-t="t-read"]', e => e.click());
  const scan = async (label) => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-read').innerText;
      const issues = [];
      if (/\bNaN\b/.test(t)) issues.push('NaN'); if (/\bundefined\b/.test(t)) issues.push('undefined'); if (/\bInfinity\b/.test(t)) issues.push('Infinity');
      if (/(^|\s)\?( ms| ns| s\b|x\b|%)|\t\?(\t|$)|^\?$/m.test(t)) issues.push('? number');
      if (/missing anchor|\[\[/.test(t)) issues.push('unexpanded marker');
      const sw = document.documentElement.scrollWidth > innerWidth;
      const box = document.getElementById('jsErr'); const eb = box && !box.hidden ? box.textContent : '';
      return { issues, sw, eb };
    });
    const problems = [...r.issues, ...(r.sw ? ['sideways scroll'] : []), ...(r.eb ? ['errbox: ' + r.eb] : []), ...errs.splice(0)];
    if (problems.length) { bad++; console.log('FAIL', scheme, width, label, problems.join('; ')) }
  };
  const shot = async (sel, name) => { if (!OUT) return; const el = await p.$(sel); if (el) { await el.scrollIntoView(); await sleep(80); await el.screenshot({ path: `${OUT}/pyo3-${name}-${scheme}-${width}.png` }) } };
  await sleep(300); await scan('load');
  // nothing moves before the reader acts: both step widgets sit on step 0 after scrolling them into view
  for (const id of ['rb-gil-card', 'rb-cx-card']) { await p.$eval('#' + id, e => e.scrollIntoView()); }
  await sleep(1500);
  const still = await p.evaluate(() => ['rb-gil-ctl-s', 'rb-cx-ctl-s'].map(i => +document.getElementById(i).value));
  if (still.some(v => v !== 0)) { bad++; console.log('FAIL autoplay', scheme, still) }
  await shot('#rb-hero-card', 'hero'); await shot('#rb-s0', 's0');
  for (const m of ['serial', 'held', 'detached', 'ft']) {
    await p.click(`#rb-gil-mode button[data-m="${m}"]`); await sleep(100);
    for (const s of [0, 20, 48]) { await p.evaluate(v => { const r = document.getElementById('rb-gil-ctl-s'); r.value = v; r.dispatchEvent(new Event('input')) }, s); await sleep(40); await scan('gil ' + m + ' ' + s) }
    await p.click('#rb-gil-ctl-b'); await p.click('#rb-gil-ctl-f'); await scan('gil step ' + m);
    if (m === 'held' || m === 'detached') await shot('#rb-gil-card', 'gil-' + m);
  }
  await p.select('#rb-gil-ctl-v', '2');
  for (const m of ['sown', 'sref', 'fvec', 'fnp']) {
    await p.click(`#rb-cx-mode button[data-m="${m}"]`); await sleep(60);
    for (let s = 0; s < 8; s++) { await p.evaluate(v => { const r = document.getElementById('rb-cx-ctl-s'); r.value = v; r.dispatchEvent(new Event('input')) }, s); await sleep(25); await scan('cross ' + m + ' ' + s); if (s === 3 && (m === 'sown' || m === 'sref' || m === 'fnp')) await shot('#rb-cx-card', `cross-${m}-${s}`) }
    await p.click('#rb-cx-ctl-p'); await sleep(150); await p.click('#rb-cx-ctl-p'); await scan('cross play ' + m);
  }
  for (const s of ['python', 'percall', 'owned', 'borrowed', 'bytes', 'parallel']) {
    await p.click(`#rb-ld-seg button[data-m="${s}"]`); await sleep(50); await scan('ladder ' + s);
    for (const c of ['prev', 'python', 'parallel']) { await p.select('#rb-ld-cmp', c); await sleep(25); await scan('ladder cmp ' + c) }
  }
  await p.click('#rb-ld-log'); await sleep(50); await scan('ladder log'); await p.click('#rb-ld-log');
  await p.click('#rb-ld-seg button[data-m="bytes"]'); await p.select('#rb-ld-cmp', 'prev'); await shot('#rb-ld-card', 'ladder');
  for (const r of await p.$$('#t-read .rb-rv')) { await r.evaluate(e => e.click()); }
  await sleep(100); await scan('reveals open');
  await p.evaluate(() => document.querySelectorAll('#t-read details').forEach(d => d.open = true)); await sleep(100); await scan('details open');
  await shot('#rb-alts', 'alts');
  await p.$eval('button[data-t="t-more"]', e => e.click()); await sleep(200);
  const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (side || errs.length) { bad++; console.log('FAIL more', side, errs.splice(0)) }
  await p.close();
}
await b.close();
console.log(bad ? `check_ui: ${bad} failures` : 'check_ui: all controls ok at 390 dark (reduced motion) and 920 light; nothing autoplays');
process.exit(bad ? 1 : 0);
