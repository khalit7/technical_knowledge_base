// Exercise every control of the page and screenshot each card, in light at 920 px and dark at 390 px (reduced motion; updated 2026-11-10 for the four 3D stages).
// usage (from the repo root): node <page folder>/src/check_page.mjs
// Reports script errors, the error box, NaN / undefined / Infinity in visible text, and sideways scroll.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = path.resolve(here, '..', 'index.html'), shots = path.resolve(here, '..', '.shots');
fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text() + ' @' + (m.stackTrace()[0] || {}).lineNumber) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const tab = async t => { await p.click(`button[data-t=${t}]`); await wait(250) };
  const clickAll = async sel => { for (const h of await p.$$(sel)) { await h.click(); await wait(60) } };
  const stepAll = async ctl => { const f = await p.$(`#${ctl}-f`); if (!f) { errs.push('no controller ' + ctl); return }
    const n = await p.$eval(`#${ctl}-s`, e => +e.max); for (let i = 0; i <= n; i++) { await f.click(); await wait(20) } };
  const range = async (id, vals) => { for (const v of vals) { await p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, String(v)); await wait(30) } };
  const select = async (id) => { const vs = await p.$$eval(`#${id} option`, o => o.map(x => x.value)); for (const v of vs) { await p.select('#' + id, v); await wait(60) } return vs };
  const shot = async (id) => { const e = await p.$('#' + id); if (e) await e.screenshot({ path: `${shots}/card-${id}-${scheme}-${width}.png` }) };
  // Reading
  await tab('t-read');
  // the four 3D stages: step each to its end (check_stages.mjs checks autoplay, step lists and the numbers)
  const stepStage = async id => { const n = await p.$eval(`#${id}-r`, e => +e.max); for (let i = 0; i <= n; i++) { await p.click(`#${id}-f`); await wait(40) } };
  for (const c of await p.$$('#dkP button')) { await c.click(); await stepStage('stg-dk'); await range('dkT', [-2, -1, 0, 1, 2, 3]); }
  await range('dkT', [0]); await shot('stg-dk');
  await range('klW', [0.2, 0.8, 0.6]); await range('klS', [4, 36, 22]); await stepStage('stg-kl'); await shot('stg-kl');
  await stepStage('stg-fl'); await shot('stg-fl'); await stepStage('stg-pr'); await shot('stg-pr');
  await shot('ts');
  await clickAll('#rlM button'); await shot('rl');
  for (let i = 0; i < 9; i++) { await p.evaluate(i => { const r = document.querySelector('#bdSvg rect[data-i="' + i + '"]'); if (r) r.dispatchEvent(new MouseEvent('click', { bubbles: true })) }, i); await wait(30) } await shot('bd');
  await clickAll('#hp .opts button'); await shot('hp'); await shot('tk');
  await shot('hero');
  // Toy
  await tab('t-toy');
  for (const m of ['1', '2', '3', '4', '5']) { await p.select('#tyM', m); for (const x of ['0', '10']) { await p.select('#tyX', x); for (const d of ['m', 'a']) { await p.select('#tyD', d); await wait(30) } } }
  await p.select('#tyM', '1'); await p.select('#tyX', '0'); await p.select('#tyD', 'm'); await shot('ty');
  await clickAll('#tyMs input'); await clickAll('#tyMs input'); await shot('tyR');
  const ps = await p.$$eval('#twP option', o => o.map(x => x.value)), ms = await p.$$eval('#twM option', o => o.map(x => x.value));
  for (const pv of ps) for (const mv of ms) { await p.select('#twP', pv); await p.select('#twM', mv); await stepAll('twC') }
  await p.select('#twP', ps[0]); await p.select('#twM', 'rkl_on'); await shot('tw');
  // Small models
  await tab('t-small');
  for (const m of await p.$$eval('#smM option', o => o.map(x => x.value))) { await p.select('#smM', m); for (const r of ['all', '1', '0']) { await p.select('#smR', r); await select('smH'); await p.select('#smH', 'all') } }
  await p.select('#smM', 'gpqa'); await p.select('#smR', 'all'); await stepAll('smA');
  const np = await p.$$eval('#smC circle[data-s]', c => c.length); for (let i = 0; i < Math.min(np, 40); i++) { await p.evaluate(i => { const c = document.querySelectorAll('#smC circle[data-s]')[i]; if (c) c.dispatchEvent(new MouseEvent('click', { bubbles: true })) }, i); await wait(10) }
  await shot('sm');
  await tab('t-more');
  // text checks over every tab
  for (const t of ['t-read', 't-toy', 't-small', 't-more']) {
    await tab(t);
    const txt = await p.$eval('#' + t, e => e.innerText);
    for (const w of ['NaN', 'undefined', 'Infinity', '[object']) if (txt.includes(w)) errs.push(`${t}: "${w}" in text`);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth); if (sw) errs.push(t + ': sideways scroll');
  }
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) errs.push('error box: ' + box);
  console.log(scheme, width, errs.length ? JSON.stringify([...new Set(errs.map(e => e.replace(/\("[^)]*\)/g, '(..)')))], null, 1) : 'ok'); bad += errs.length;
  await p.close();
}
// motion (2026-11-06): the Reading stages play by themselves once in view (checked in check_stages.mjs); the two tab replays are widgets and never do
{ const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 }); await p.goto('file://' + file);
  const moved = [];
  for (const [t, c, ctl] of [['t-toy', 'tw', 'twC'], ['t-small', 'sm', 'smA']]) { await p.click(`button[data-t=${t}]`); await p.$eval('#' + c, e => e.scrollIntoView()); const v0 = await p.$eval(`#${ctl}-s`, e => +e.value); await new Promise(r => setTimeout(r, 2500)); if (await p.$eval(`#${ctl}-s`, e => +e.value) !== v0) moved.push(c) }
  await p.click('button[data-t=t-read]'); await p.$eval('#stg-kl', e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 2500));
  const played = await p.$eval('#stg-kl', e => +e.dataset.frames || 0);
  console.log('widgets moved', moved.length ? moved.join(',') : 'none', '· stage played', played > 0); if (moved.length || !played) bad++; await p.close() }
await b.close();
process.exit(bad ? 1 : 0);
