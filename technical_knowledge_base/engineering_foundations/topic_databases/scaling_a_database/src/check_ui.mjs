// Clicks every control on every tab at 390 dark and 920 light; reports errors, NaN/undefined text, sideways scroll; screenshots sections and visuals.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_databases/scaling_a_database/src/check_ui.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = path.resolve(here, '..', 'index.html');
const out = process.argv[2] || path.resolve(here, '..', '.shots', 'ui');
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let problems = 0, clicks = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file); await sleep(300);
  const bad = async label => {
    const r = await p.evaluate(() => { const t = document.body.innerText; const m = t.match(/.{0,40}(NaN|undefined|Infinity|\[object|not measured).{0,40}/);
      const box = document.getElementById('jsErr'); return { m: m ? m[0] : '', side: document.documentElement.scrollWidth > innerWidth + 1, box: box && !box.hidden ? box.textContent : '' }; });
    if (r.m || r.side || r.box || errs.length) { problems++; console.log('PROBLEM', scheme, width, label, JSON.stringify(r), errs.splice(0)); }
  };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) await el.screenshot({ path: `${out}/${name}-${scheme}-${width}.png` }); };
  const setRange = async (id, v) => { await p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }, id, v); clicks++; };
  const clickAll = async sel => { const n = await p.$$eval(sel, es => es.length); for (let i = 0; i < n; i++) { await p.evaluate((sel, i) => document.querySelectorAll(sel)[i].click(), sel, i); clicks++; } return n; };
  await p.click('button[data-t=t-read]'); await sleep(200);
  // reduced motion is emulated here, so no stage may move by itself (autoplay in view is checked by check_stages.mjs)
  await sleep(2500);
  const still = await p.evaluate(() => [...document.querySelectorAll('.stg')].map(s => +s.dataset.frames || 0));
  if (still.some(v => v > 0)) { problems++; console.log('PROBLEM moved under reduced motion', still); }
  await clickAll('#ldr button'); await shot('#stg-hero', 'hero'); await shot('#rd-one', 'one'); await bad('ladder');
  for (const n of [1, 6, 7, 20, 100]) { await setRange('cnP', n); for (const m of ['direct', 'pool']) { await p.evaluate(m => document.querySelector(`#cnM button[data-m=${m}]`).click(), m); clicks++; if (n === 20) await shot('#cnCard', `pool-${m}`); } }
  await bad('pool');
  // every stage, every step (and every mode of the replica stage)
  const stepAll = async (id, tag) => { const n = await p.$eval(`#${id}-r`, e => +e.max + 1); for (let i = 0; i < n; i++) { await setRange(`${id}-r`, i); if (i === Math.floor(n / 2)) await shot('#' + id, `${tag}-${i}`); } await bad(tag); };
  for (const m of ['naive', 'sticky', 'lsn']) { await p.evaluate(m => document.querySelector(`#rwM button[data-m=${m}]`).click(), m); clicks++; await stepAll('stg-ryw', 'ryw-' + m); }
  for (const id of ['stg-hero', 'stg-fan', 'stg-2pc', 'stg-rebal', 'stg-rg']) await stepAll(id, id.slice(4));
  for (const id of ['stg-fan-p', 'stg-fan-f', 'stg-fan-b', 'stg-fan-p']) { await p.click('#' + id); clicks++; await sleep(40); }
  await p.evaluate(() => { const s = document.getElementById('stg-fan-s'); s.value = '2'; s.dispatchEvent(new Event('change')); }); clicks++;
  for (const m of ['before', 'after']) { await p.evaluate(m => document.querySelector(`#fsM button[data-m="${m}"]`).click(), m); clicks++; await shot('#fsCard', `split-${m}`); }
  for (const m of ['rep', 'geo', 'glob']) { await p.evaluate(m => document.querySelector(`#geM button[data-m="${m}"]`).click(), m); clicks++; await shot('#geCard', `geo-${m}`); }
  await shot('#xsCard', 'cross'); await bad('new figures');
  for (const q of ['dash', 'chat', 'chat_week']) for (const l of ['messages', 'messages_month', 'messages_hash']) {
    await p.evaluate((q, l) => { document.querySelector(`#ptQ button[data-m=${q}]`).click(); document.querySelector(`#ptL button[data-m=${l}]`).click(); }, q, l); clicks += 2;
    if (l === 'messages_month') await shot('#ptCard', `pt-${q}`);
  }
  await bad('partitions');
  await p.evaluate(() => document.querySelectorAll('#t-read details').forEach(d => d.open = true));
  const secs = await p.$$eval('#t-read section', es => es.map(e => e.id));
  for (const id of secs) await shot('#' + id, 'sec-' + id);
  await bad('reading');
  if (scheme === 'light') { const nums = await p.evaluate(() => { const o = {}; document.querySelectorAll('.m[data-k]').forEach(e => o[e.dataset.k] = e.textContent);
      o.skTable = [...document.querySelectorAll('#skTable tr')].map(r => [...r.querySelectorAll('td.num')].map(td => td.textContent));
      o.rsBars = [...document.querySelectorAll('#rsBars .val')].map(e => e.textContent); return o; });
    fs.writeFileSync(path.resolve(here, 'page_numbers.json'), JSON.stringify(nums, null, 1)); }
  await p.click('button[data-t=t-read]'); await sleep(200);
  for (const k of ['user_hash', 'chat_hash', 'country', 'user_range', 'month_range']) for (const n of [2, 8, 16]) for (const m of ['0', '1']) {
    await p.evaluate((k, m) => { document.getElementById('lbKey').value = k; document.getElementById('lbMet').value = m; }, k, m);
    await setRange('lbN', n); await setRange('lbG', n === 8 ? 10 : 0);
    if (n === 8 && m === '1') await shot('#rd-lab', `lab-${k}`);
  }
  await bad('lab');
  await p.click('button[data-t=t-more]'); await sleep(150); await shot('#s-more', 'more'); await bad('more');
  await p.close();
}
await b.close();
console.log('clicks', clicks, 'problems', problems);
