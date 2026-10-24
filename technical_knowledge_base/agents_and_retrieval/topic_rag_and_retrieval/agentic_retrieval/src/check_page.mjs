// Click every control of the page at 390 px dark and 920 px light; fail on JS errors, NaN, undefined, sideways scroll.
// usage: node check_page.mjs ../index.html <screenshot folder>
// (puppeteer from html_utils' node_modules; Chrome headless shell)
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = path.resolve(process.argv[2] || '../index.html'), shots = process.argv[3] || '/tmp';
fs.mkdirSync(shots, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let bad = 0;
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: w, height: 900 });
  await page.goto('file://' + file);
  await page.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  const check = async (label) => {
    const r = await page.evaluate(() => {
      const tab = [...document.querySelectorAll('.tab')].find(t => !t.hidden);
      const txt = tab ? tab.innerText : '';
      return { nan: /\bNaN\b/.test(txt), undef: /\bundefined\b/.test(txt), side: document.documentElement.scrollWidth > innerWidth + 1, err: document.getElementById('jsErr').hidden === false };
    });
    if (r.nan || r.undef || r.side || r.err) { bad++; console.log('FAIL', scheme, w, label, JSON.stringify(r)); }
  };
  const tab = async t => { await page.click('#tabs button[data-t="' + t + '"]'); await new Promise(r => setTimeout(r, 150)); };
  // Reading: every animation control, every chip, every seg button, every predict chip, every details
  await tab('t-read');
  for (const id of ['ar-hopctl', 'ar-taxctl']) {
    for (const b of ['f', 'f', 'f', 'b', 'p', 'p']) await page.click('#' + id + '-' + b);
    await check(id);
  }
  const hopN = await page.$$eval('#ar-hopq button', b => b.length);
  for (let i = 0; i < hopN; i++) { await page.click('#ar-hopq button[data-m="' + i + '"]'); for (let k = 0; k < 4; k++) await page.click('#ar-hopctl-f'); await check('hop ' + i); }
  for (const m of ['a', 'b', 'c']) { await page.click('#ar-taxseg button[data-m="' + m + '"]'); for (let k = 0; k < 8; k++) await page.click('#ar-taxctl-f'); await check('tax ' + m); }
  await page.click('#ar-q1 .chips button'); await check('predict');
  for (const v of [1, 2, 3, 4]) { await page.$eval('#ar-stairn', (el, v) => { el.value = v; el.dispatchEvent(new Event('input')) }, v); await check('stair ' + v); }
  // no animation may have moved before the reader acts (checked on a fresh load below)
  await page.$$eval('#t-read details', d => d.forEach(x => x.open = true)); await check('details');
  await page.screenshot({ path: shots + `/read-${scheme}-${w}.png`, fullPage: false });
  for (const sel of ['#ar-herofig', '#ar-stairfig', '#ar-hopcard', '#ar-taxcard', '#ar-fmt', '#ar-hopbars', '#ar-budget', '#ar-meth', '#ar-auroc', '#ar-routefig', '#ar-dr', '#ar-lcacc', '#ar-lim', '#ar-val', '#ar-mem', '#ar-posbox']) {
    const el = await page.$(sel); if (el) { await el.scrollIntoView(); await el.screenshot({ path: shots + `/${sel.slice(1)}-${scheme}-${w}.png` }); }
  }
  // Trajectory comparer: every filter, every question, scrub
  await tab('t-artraj');
  for (const f of ['all', 'aw', 'pw', 'bw', 'br', 'cp']) {
    await page.select('#tj-filter', f);
    const opts = await page.$$eval('#tj-pick option', o => o.map(x => x.value));
    for (const v of opts) { await page.select('#tj-pick', v); await check('traj ' + f + ' ' + v); }
  }
  await page.select('#tj-filter', 'aw');
  for (const b of ['b', 'b', 'b', 'f']) await page.click('#tj-ctl-' + b);
  await page.$eval('#tj-ctl-s', e => { e.value = 8; e.dispatchEvent(new Event('input')) }); await check('traj scrub');
  (await page.$('#tj-card')).screenshot({ path: shots + `/traj-${scheme}-${w}.png` });
  await page.screenshot({ path: shots + `/traj-full-${scheme}-${w}.png`, fullPage: true });
  // Router lab: every signal x path x share
  await tab('t-read');
  const sigs = await page.$$eval('#rt-sig option', o => o.map(x => x.value));
  for (const c of ['closed', 'single_k5']) for (const e of ['react', 'longctx']) {
    await page.select('#rt-cheap', c); await page.select('#rt-exp', e);
    for (const s of sigs) { await page.select('#rt-sig', s); for (const v of [0, 30, 100]) { await page.$eval('#rt-sh', (el, v) => { el.value = v; el.dispatchEvent(new Event('input')) }, v); await check(`route ${c} ${e} ${s} ${v}`); } }
  }
  await page.select('#rt-cheap', 'single_k5'); await page.select('#rt-exp', 'react'); await page.select('#rt-sig', 'ce1');
  await page.$eval('#rt-sh', el => { el.value = 50; el.dispatchEvent(new Event('input')) });
  const f1 = await page.$eval('#rt-out', e => e.dataset.f1);
  console.log('router ce1 50% F1 in page', f1);
  (await page.$('#ar-routefig')).screenshot({ path: shots + `/route-${scheme}-${w}.png` });
  // Long-context calculator: every slider extreme, every preset and model
  await tab('t-arlong');
  for (const id of ['lc-N', 'lc-k', 'lc-c', 'lc-q', 'lc-a', 'lc-d']) {
    for (const which of ['min', 'max']) { await page.$eval('#' + id, (el, w) => { el.value = el[w]; el.dispatchEvent(new Event('input')) }, which); await check(id + ' ' + which); }
    await page.$eval('#' + id, el => { el.value = el.defaultValue; el.dispatchEvent(new Event('input')) });
  }
  for (const p of await page.$$eval('#lc-price option', o => o.map(x => x.value))) for (const m of ['Qwen3-1.7B', 'Qwen3-4B']) {
    await page.select('#lc-price', p); await page.select('#lc-model', m); await check('price ' + p + ' ' + m);
  }
  for (const b of ['f', 'f', 'p', 'p', 'b']) await page.$eval('#lc-ctl-' + b, e => e.click());
  await check('lc anim');
  await page.screenshot({ path: shots + `/long-${scheme}-${w}.png`, fullPage: true });
  await tab('t-more'); await check('more');
  const p2 = await browser.newPage(); await p2.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]); await p2.setViewport({ width: w, height: 900 });
  await p2.goto('file://' + file); await p2.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p2.reload();
  for (const sel of ['#ar-hopcard', '#ar-taxcard']) { await p2.$eval(sel, e => e.scrollIntoView()); await new Promise(r => setTimeout(r, 2600)); }
  const moved = await p2.evaluate(() => ['ar-hopctl-s', 'ar-taxctl-s'].map(id => +document.getElementById(id).value));
  if (moved.some(v => v !== 0)) { bad++; console.log('AUTOPLAY', scheme, w, moved); }
  await p2.close();
  if (errs.length) { bad++; console.log('ERRORS', scheme, w, errs.slice(0, 5)); }
  await page.close();
}
await browser.close();
console.log(bad ? 'FAILED ' + bad : 'ALL OK');
process.exit(bad ? 1 : 0);
