// Click every control on every tab at 390 dark and 920 light; report errors, NaN/undefined, sideways scroll;
// save element screenshots of the main visuals. Usage: node src/check_ui.mjs <abs path to index.html> <shots dir>
import { createRequire } from 'module';
const require = createRequire(new URL('../../../../../html_utils/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const FILE = 'file://' + process.argv[2];
const OUT = process.argv[3];
const browser = await puppeteer.launch({ headless: 'shell' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await page.goto(FILE);
  await page.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await page.reload();
  const counts = {};
  const shot = async (sel, name) => { const el = await page.$(sel); if (el) { await el.scrollIntoView(); await sleep(150); await el.screenshot({ path: `${OUT}/${name}-${scheme}-${w}.png` }) } };
  // Reading: boundary animation, every step
  counts.ab = await page.evaluate(() => { const f = document.getElementById('rd-ab-ctl-f'); let n = 0; for (let i = 0; i < 12; i++) { f.click(); n++ } document.getElementById('rd-ab-ctl-b').click(); const s = document.getElementById('rd-ab-ctl-s'); s.value = 1; s.dispatchEvent(new Event('input')); return n });
  await page.click('#rd-ab-ctl-p'); await sleep(800); await page.click('#rd-ab-ctl-p');
  await page.evaluate(() => { const s = document.getElementById('rd-ab-ctl-s'); s.value = 3; s.dispatchEvent(new Event('input')) });
  await shot('#rd-ab-card', 'boundary');
  counts.details = await page.evaluate(() => { const d = document.querySelectorAll('#t-read details'); d.forEach(x => x.open = true); return d.length });
  await shot('#rd-runs', 'runbars');
  await shot('#rd-0 .tw', 'onescreen');
  // runs tab via a bar in the Reading tab
  await page.evaluate(() => document.querySelector('#rd-runbars .row').click());
  await sleep(200);
  counts.board = await page.evaluate(() => { const rows = document.querySelectorAll('#hr-board tbody tr'); let n = 0;
    for (let i = 0; i < rows.length; i++) { document.querySelectorAll('#hr-board tbody tr')[i].click(); const bs = document.querySelectorAll('#hr-strip button'); bs.forEach((b, j) => { document.querySelectorAll('#hr-strip button')[j].click(); n++ }); document.getElementById('hr-prev').click(); document.getElementById('hr-next').click() } return n });
  counts.anat = await page.evaluate(() => { const r = document.querySelectorAll('#hr-anat .row'); r.forEach((x, i) => document.querySelectorAll('#hr-anat .row')[i].click()); return r.length });
  await page.evaluate(() => document.querySelectorAll('#hr-board tbody tr')[0].click());
  await shot('#hr-card', 'runcard');
  await shot('#hr-anat', 'anatomy');
  // repo map tab
  await page.click('#tabs button[data-t="t-map"]');
  counts.map = await page.evaluate(() => { let n = 0; for (const b of document.querySelectorAll('#hm-seg button')) { b.click(); for (const v of ['256', '512', '1024', '2048']) { const s = document.getElementById('hm-bud'); s.value = v; s.dispatchEvent(new Event('change')); n++ } } document.getElementById('hm-all').click(); document.getElementById('hm-all').click(); const f = document.getElementById('hm-anim-f'); f.click(); f.click(); document.getElementById('hm-anim-b').click(); return n });
  await page.click('#hm-anim-p'); await sleep(600); await page.click('#hm-anim-p');
  await shot('#hm-card', 'repomap');
  await page.click('#tabs button[data-t="t-more"]');
  const r = await page.evaluate((w) => {
    const bad = [], wide = [];
    for (const id of ['t-read', 't-runs', 't-map', 't-more']) {
      const t = document.getElementById(id); t.hidden = false;
      bad.push(...((t.innerText.match(/\bNaN\b|\bundefined\b|Infinity/g) || []).map(x => id + ':' + x)));
      t.querySelectorAll('*').forEach(e => { const b = e.getBoundingClientRect(); if (b.right > w + 1 && b.width > 0 && !e.closest('.tw,pre,.nav,.strip,.hmwrap')) wide.push(id + ' ' + e.tagName + '#' + e.id + '.' + e.className + ' ' + Math.round(b.right)) });
    }
    return { bad, sideways: document.documentElement.scrollWidth > w, sw: document.documentElement.scrollWidth, wide: wide.slice(0, 10) };
  }, w);
  console.log(scheme, w, JSON.stringify({ errs, ...r, counts }));
  await page.close();
}
await browser.close();
