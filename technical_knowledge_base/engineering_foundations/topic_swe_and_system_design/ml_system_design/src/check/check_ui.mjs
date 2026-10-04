// Click every control of the page at 390 dark and 920 light; report errors, NaN/undefined text, sideways scroll; save card screenshots.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/ml_system_design/src/check/check_ui.mjs
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const dir = 'technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/ml_system_design';
const file = 'file://' + path.resolve(dir, 'index.html'); const out = path.resolve(dir, '.shots'); fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
let problems = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.goto(file);
  const bad = async (where) => { const r = await p.evaluate(() => { const t = document.body.innerText; return { nan: /\bNaN\b|undefined|Infinity/.test(t), side: document.documentElement.scrollWidth > innerWidth } });
    if (r.nan || r.side) { problems++; console.log('PROBLEM', scheme, width, where, JSON.stringify(r)) } };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await el.screenshot({ path: path.join(out, name + '-' + scheme + '-' + width + '.png') }) } };
  await shot('#rd-arch', 'arch');
  // autoscale animation: each policy, step to a few points
  for (const m of ['cpu', 'rps', 'queue', 'warm']) {
    await p.click(`#rd-as-seg button[data-m=${m}]`);
    for (const i of [0, 12, 30, 80]) { await p.$eval('#rd-as-ctl-s', (e, i) => { e.value = i; e.dispatchEvent(new Event('input')) }, i); await bad('as ' + m + ' ' + i) }
    await p.$eval('#rd-as-ctl-s', e => { e.value = 20; e.dispatchEvent(new Event('input')) });
    await shot('#rd-as-card', 'as-' + m);
  }
  await p.click('#rd-as-ctl-f'); await p.click('#rd-as-ctl-b'); await p.click('#rd-as-ctl-p'); await new Promise(r => setTimeout(r, 300)); await p.click('#rd-as-ctl-p');
  await p.select('#rd-as-ctl-v', '2');
  for (const m of ['before', 'after']) { await p.click(`#rd-pc-seg button[data-m=${m}]`);
    for (const i of [0, 3, 5]) { await p.$eval('#rd-pc-ctl-s', (e, i) => { e.value = i; e.dispatchEvent(new Event('input')) }, i); await bad('pc ' + m + ' ' + i) }
    await shot('#rd-pc-card', 'pc-' + m) }
  // gateway lab
  await p.click('button[data-t=t-gw]'); await new Promise(r => setTimeout(r, 200));
  for (const pr of ['naive', 'tuned', 'semantic', 'outage_nofb', 'outage_fb', 'selfhost']) { await p.click(`#gw-pre button[data-p=${pr}]`); await bad('gw ' + pr); if (pr === 'tuned' || pr === 'outage_fb') await shot('#t-gw', 'gw-' + pr) }
  for (const id of ['rps', 'easy', 'acc', 'exact', 'prefix', 'semhit', 'semfalse', 'outage', 'det']) {
    for (const v of ['min', 'max']) { await p.$eval('#gw-' + id, (e, v) => { e.value = e[v]; e.dispatchEvent(new Event('input')) }, v); await bad('gw ' + id + ' ' + v) } }
  for (const id of ['router', 'sem', 'fb']) { await p.click('#gw-' + id); await bad('gw ' + id); await p.click('#gw-' + id) }
  for (const [id, vals] of [['tin', ['200', '20000']], ['tout', ['100', '1500']], ['big', ['gpt61sol', 'sonnet']], ['small', ['luna', 'llama', 'haiku']], ['fbm', ['sonnet', 'gpt61sol']]]) for (const v of vals) { await p.select('#gw-' + id, v); await bad('gw ' + id + ' ' + v) }
  await p.click('button[data-t=t-more]'); await bad('more');
  // tab links from the reading tab
  await p.click('button[data-t=t-read]'); const n = await p.$$eval('#t-read a[data-tab]', a => a.length);
  const ext = await p.$$eval('a[href^=http]', a => a.filter(x => x.target !== '_blank' || x.rel !== 'noopener noreferrer').length);
  console.log(scheme, width, 'errors', JSON.stringify(errs), 'tab links', n, 'external links missing target/rel', ext);
  if (errs.length || ext) problems++;
  await p.close();
}
await b.close(); console.log('problems', problems);
