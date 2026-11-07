// Puppeteer check of every control on this page at 390 px dark (reduced motion) and 920 px light:
// no errors, NaN, undefined or '?' numbers, no sideways scroll; under reduced motion no stage moves by itself, and the ladder widget never does.
// (Since 2026-11-07 the four 3D stages play by themselves once scrolled into view: ../check_stages.mjs checks that, step lists and numbers.)
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
  // under reduced motion nothing moves by itself; the ladder is a widget and never plays at all
  for (const id of ['stg-build', 'stg-cross', 'stg-gil', 'stg-wheel', 'rb-ld-card']) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await sleep(1200); }
  const still = await p.evaluate(() => [['stg-build', 'stg-cross', 'stg-gil', 'stg-wheel'].map(i => +document.getElementById(i).dataset.frames || 0), document.querySelector('#rb-ld-seg button.on').dataset.m]);
  if (motion === 'reduce' && still[0].some(v => v !== 0)) { bad++; console.log('FAIL moved under reduced motion', scheme, still[0]) }
  if (still[1] !== 'python') { bad++; console.log('FAIL ladder moved by itself', scheme, still[1]) }
  await shot('#rb-hero-card', 'hero'); await shot('#rb-s0', 's0');
  // every stage: through all its steps with the forward button, then back with the list
  for (const id of ['stg-build', 'stg-cross', 'stg-gil', 'stg-wheel']) {
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
    for (let k = 1; k < n; k++) { await p.$eval(`#${id}-f`, e => e.click()); await sleep(60); await scan(id + ' step ' + (k + 1)) }
    await p.$eval(`#${id}-b`, e => e.click()); await p.select(`#${id}-s`, '2'); await p.$eval(`#${id}-p`, e => e.click()); await sleep(150); await p.$eval(`#${id}-p`, e => e.click()); await scan(id + ' play and pause');
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
console.log(bad ? `check_ui: ${bad} failures` : 'check_ui: all controls ok at 390 dark (reduced motion) and 920 light; nothing moves under reduced motion; the ladder widget never plays');
process.exit(bad ? 1 : 0);
