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
  await clickAll('#ldr button'); await shot('#rd-one', 'one'); await bad('ladder');
  for (const q of ['dash', 'chat', 'chat_week']) for (const l of ['messages', 'messages_month', 'messages_hash']) {
    await p.evaluate((q, l) => { document.querySelector(`#ptQ button[data-m=${q}]`).click(); document.querySelector(`#ptL button[data-m=${l}]`).click(); }, q, l); clicks += 2;
    if (l === 'messages_month') await shot('#ptCard', `pt-${q}`);
  }
  await bad('partitions');
  for (const q of ['user', 'mention']) for (const m of ['big', 'shard']) {
    await p.evaluate((q, m) => { document.querySelector(`#fanQ button[data-m=${q}]`).click(); document.querySelector(`#fanM button[data-m=${m}]`).click(); }, q, m); clicks += 2;
    for (let i = 0; i < 6; i++) { await setRange('fanCtl-s', i); if (i === 3 || i === 5) await shot('#fanCard', `fan-${q}-${m}-${i}`); }
    await bad('fan ' + q + m);
  }
  for (const id of ['fanCtl-p', 'fanCtl-f', 'fanCtl-b', 'fanCtl-p']) { await p.click('#' + id); clicks++; await sleep(40); }
  await p.evaluate(() => { const s = document.getElementById('fanCtl-v'); s.value = '2'; s.dispatchEvent(new Event('change')); }); clicks++;
  await p.evaluate(() => document.querySelectorAll('#t-read details').forEach(d => d.open = true));
  const secs = await p.$$eval('#t-read section', es => es.map(e => e.id));
  for (const id of secs) await shot('#' + id, 'sec-' + id);
  await bad('reading');
  if (scheme === 'light') { const nums = await p.evaluate(() => { const o = {}; document.querySelectorAll('.m[data-k]').forEach(e => o[e.dataset.k] = e.textContent);
      o.skTable = [...document.querySelectorAll('#skTable tr')].map(r => [...r.querySelectorAll('td.num')].map(td => td.textContent));
      o.rsBars = [...document.querySelectorAll('#rsBars .val')].map(e => e.textContent); return o; });
    fs.writeFileSync(path.resolve(here, 'page_numbers.json'), JSON.stringify(nums, null, 1)); }
  await p.click('button[data-t=t-lab]'); await sleep(200);
  for (const k of ['user_hash', 'chat_hash', 'country', 'user_range', 'month_range']) for (const n of [2, 8, 16]) for (const m of ['0', '1']) {
    await p.evaluate((k, m) => { document.getElementById('lbKey').value = k; document.getElementById('lbMet').value = m; }, k, m);
    await setRange('lbN', n); await setRange('lbG', n === 8 ? 10 : 0);
    if (n === 8 && m === '1') await shot('#s-lab', `lab-${k}`);
  }
  await bad('lab');
  await p.click('button[data-t=t-more]'); await sleep(150); await shot('#s-more', 'more'); await bad('more');
  await p.close();
}
await b.close();
console.log('clicks', clicks, 'problems', problems);
