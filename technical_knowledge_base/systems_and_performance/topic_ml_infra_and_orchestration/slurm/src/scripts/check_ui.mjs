// Click every control of the Slurm page at 390 px dark and 920 px light; report script errors, NaN/undefined in visible text,
// sideways scroll; screenshot the main cards after interaction. One browser, closed at the end.
// usage: node check_ui.mjs <repo root> <page index.html> <shots dir>
import { createRequire } from 'node:module';
import path from 'node:path';
const [root, file, shots] = process.argv.slice(2);
const require = createRequire(path.join(root, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const b = await puppeteer.launch({ headless: 'shell' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file)); await sleep(300);
  const tabs = await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t));
  let clicks = 0;
  for (const t of tabs) {
    await p.click(`#tabs button[data-t=${t}]`); await sleep(250);
    // every button, select and input inside the tab
    const n = await p.$$eval(`#${t} button, #${t} select, #${t} input`, els => els.length);
    for (let i = 0; i < n; i++) {
      const kind = await p.evaluate((t, i) => { const el = document.querySelectorAll(`#${t} button, #${t} select, #${t} input`)[i];
        if (!el || el.offsetParent === null) return 'hidden';
        el.scrollIntoView({ block: 'center' });
        if (el.tagName === 'SELECT') { const o = el.options; el.value = o[o.length - 1].value; el.dispatchEvent(new Event('change', { bubbles: true })); return 'select' }
        if (el.tagName === 'INPUT') { if (el.type === 'range') { el.value = el.max || 5 } else if (el.type === 'search') { el.value = 'GRES' } else { el.value = '3' }
          el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return 'input' }
        if (el.closest('#tabs')) return 'tabbar';
        el.click(); return 'button' }, t, i);
      if (kind !== 'hidden' && kind !== 'tabbar') clicks++;
      if (i % 25 === 0) await sleep(20);
    }
    // click svg groups (map boxes, priority rows) and table rows
    await p.evaluate(t => { document.querySelectorAll(`#${t} svg g[data-k], #${t} svg g[data-j], #${t} tbody tr[data-i]`).forEach(g => g.dispatchEvent(new MouseEvent('click', { bubbles: true }))) }, t);
    await sleep(200);
    const txt = await p.evaluate(t => document.getElementById(t).innerText, t);
    const m = txt.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,40}/g);
    if (m) { errs.push(`${t}: ${m.slice(0, 3).join(' | ')}`) }
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (sw) errs.push(`${t}: sideways scroll`);
  }
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) errs.push('error box: ' + box);
  const okRows = await p.$$eval('#pc-tab td.ok', e => e.length); if (okRows !== 22) errs.push('calculator reproduces ' + okRows + ' of 22 sprio rows');
  // fresh load for screenshots of cards at a mid step
  await p.goto('file://' + path.resolve(file)); await sleep(300);
  const shot = async (t, sel, name, prep) => { await p.click(`#tabs button[data-t=${t}]`); await sleep(200);
    await p.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }) }, sel); await sleep(700);
    if (prep) await p.evaluate(prep); await sleep(300); const el = await p.$(sel); if (el) await el.screenshot({ path: `${shots}/${name}-${scheme}-${width}.png` }) };
  const slider = (id, v) => `(()=>{const s=document.getElementById('${id}');s.value=${v};s.dispatchEvent(new Event('input',{bubbles:true}))})()`;
  for (const c of ['sl-hero-card','sl-lm-card','sl-pe-card','sl-rv-card','sl-dg-card']) await shot('t-read', '#'+c, c.replace('-card',''));
  await shot('t-read', '#sl-sg-card', 'sg0');
  await shot('t-read', '#sl-sg-card', 'sg1', `document.querySelector('#sl-sg-mode button[data-m="1"]').click()`);
  await shot('t-read', '#sl-bf-card', 'bf0');
  await shot('t-read', '#sl-bf-card', 'bf4', slider('sl-bf-ctl-s', 4));
  await shot('t-read', '#sl-bf-card', 'bf6', slider('sl-bf-ctl-s', 6));
  await shot('t-read', '#sl-st-card', 'steps-plain', slider('sl-st-ctl-s', 8));
  await shot('t-read', '#sl-pq-card', 'prio-snap1', `document.querySelector('#sl-pq-mode button[data-m="1"]').click()`);
  await shot('t-read', '#sl-lf-card', 'life-busy', slider('sl-lf-ctl-s', 9));
  await shot('t-read', '#sl-lf-card', 'life-idle', `document.querySelector('#sl-lf-mode button[data-m="idle"]').click();` + slider('sl-lf-ctl-s', 8));
  await shot('t-read', '#sl-pc-card', 'calc');
  await shot('t-why', '#t-why', 'why', `(()=>{const q=document.getElementById('wy-q');q.value='QOSGrpGRESRunMinutes';q.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  // nothing may move before the reader acts: every step controller still on step 0 after scrolling past
  const moved = await p.evaluate(() => [...document.querySelectorAll('input[type=range][id$="-ctl-s"]')].filter(r => +r.value !== 0 && !['sl-bf-ctl-s','sl-st-ctl-s','sl-lf-ctl-s'].includes(r.id)).map(r => r.id));
  if (moved.length) errs.push('moved without the reader: ' + moved.join(','));
  console.log(scheme, width, 'controls', clicks, 'calc rows ok', okRows, 'errors', JSON.stringify(errs));
  if (errs.length) bad = 1;
  await p.close();
}
await b.close();
process.exit(bad);
