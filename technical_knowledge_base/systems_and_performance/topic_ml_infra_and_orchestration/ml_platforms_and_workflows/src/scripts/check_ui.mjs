// Click every control of the ML platforms page at 390 px dark and 920 px light; report script errors, NaN/undefined in visible text,
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
    await p.evaluate(t => { document.querySelectorAll(`#${t} svg g[data-n]`).forEach(g => g.dispatchEvent(new MouseEvent('click', { bubbles: true }))) }, t);
    await sleep(200);
    const txt = await p.evaluate(t => document.getElementById(t).innerText, t);
    const m = txt.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,40}/g);
    if (m) { errs.push(`${t}: ${m.slice(0, 3).join(' | ')}`) }
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (sw) errs.push(`${t}: sideways scroll`);
  }
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) errs.push('error box: ' + box);
  // fresh load for screenshots of cards at a mid step
  await p.goto('file://' + path.resolve(file)); await sleep(300);
  const shot = async (t, sel, name, prep) => { await p.click(`#tabs button[data-t=${t}]`); await sleep(200);
    await p.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }) }, sel); await sleep(700);
    if (prep) await p.evaluate(prep); await sleep(300); const el = await p.$(sel); if (el) await el.screenshot({ path: `${shots}/${name}-${scheme}-${width}.png` }) };
  const slider = (id, v) => `(()=>{const s=document.getElementById('${id}');s.value=${v};s.dispatchEvent(new Event('input',{bubbles:true}))})()`;
  await shot('t-read', '#mp-rs-card', 'resume-mid', slider('mp-rs-ctl-s', 7));
  await shot('t-read', '#mp-rs-card', 'resume-end', slider('mp-rs-ctl-s', 19));
  await shot('t-read', '#mp-xp-card', 'xplat');
  await shot('t-read', '#mp-xp-card', 'xplat-rank', "document.querySelector('#mp-xp-seg button[data-k=l]').click()");
  await shot('t-lin', '#t-lin', 'lin-v1', "document.querySelector('#ln-btns button[data-n=v1]').click()");
  await shot('t-lin', '#ln-al-card', 'alias-3', slider('ln-al-ctl-s', 3));
  await shot('t-rep', '#rp-card', 'rep-v1', "document.querySelector('#rp-pick button:nth-child(1)').click();" + slider('rp-ctl-s', 5));
  await shot('t-rep', '#t-rep', 'rep-v3', "document.querySelector('#rp-pick button:nth-child(3)').click();" + slider('rp-ctl-s', 5));
  await shot('t-pick', '#t-pick', 'pick');
  console.log(scheme, width, 'controls', clicks, 'errors', JSON.stringify(errs));
  if (errs.length) bad = 1;
  await p.close();
}
await b.close();
process.exit(bad);
