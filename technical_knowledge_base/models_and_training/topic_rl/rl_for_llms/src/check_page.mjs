// Exercise every control of the page in headless Chrome and screenshot the main cards.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_rl/rl_for_llms/src/check_page.mjs [shots dir]
// Reports script errors, NaN/undefined/Infinity in visible text, and the error box.
import { createRequire } from 'module';
import path from 'node:path';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = path.join(here, '..', 'index.html'), out = process.argv[2] || path.join(here, '..', '.shots');
const b = await puppeteer.launch({ headless: 'shell' });
let problems = 0, actions = 0;
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file); await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.reload();
  const bad = async where => { const t = await p.evaluate(() => { const v = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' '); return (v.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/g) || []).slice(0, 3) });
    if (t.length) { problems++; console.log('BAD TEXT', scheme, where, t) } };
  const clickAll = async (sel, then) => { const n = await p.$$eval(sel, x => x.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); actions++; if (then) await then(i); await bad(sel + ' ' + i) } };
  const step = async (ctl, n) => { for (let k = 0; k < n; k++) { await p.evaluate(c => document.getElementById(c + '-f').click(), ctl); actions++ } };
  // Reading animations: every mode, every step
  for (const [modes, ctl, n] of [['#rd-onM button', 'rd-onC', 6], ['#rd-grK button', 'rd-grC', 5], ['#rd-czM button', 'rd-czC', 17], ['#rd-asM button', 'rd-asC', 40]]) {
    await clickAll(modes, async () => { await step(ctl, n) });
  }
  await clickAll('#rd-onR button', async () => { await step('rd-onC', 6) });
  await clickAll('#rd-grG button', async () => { await step('rd-grC', 5) });
  await clickAll('#rd-pkM button');
  for (const [id, vals] of [['rd-czP', [0, 50, 100]], ['rd-czH', [1, 30, 60]], ['rd-olS', [0, 13000, 20000]]]) for (const v of vals) { await p.evaluate((id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input')) }, id, v); actions++; await bad(id + '=' + v) }
  await p.evaluate(() => document.querySelector('#rd-grP .rd-grR')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))); actions++;
  // the mismatch card and the RM scatter now sit in the Reading tab (sections 8 and 10)
  await clickAll('#mi-M button', async () => { for (const v of [100, 300, 500]) { await p.evaluate(v => { const e = document.getElementById('mi-C'); e.value = v; e.dispatchEvent(new Event('input')) }, v) } for (const v of [1, 50, 100]) { await p.evaluate(v => { const e = document.getElementById('mi-B'); e.value = v; e.dispatchEvent(new Event('input')) }, v) } });
  await p.evaluate(() => document.querySelector('#mi-M button').click());
  // nothing may move before the reader acts: every step scrubber still at 0 after scrolling everything into view (reduced motion is on, so check the play buttons too)
  await p.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  await p.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = false));
  await p.evaluate(() => { document.querySelector('#rd-onM button').click() }); await step('rd-onC', 4);
  for (const id of ['rd-hero', 'rd-on', 'rd-gr', 'rd-cz', 'rd-as', 'rd-k3', 'rd-pk', 'rd-ol']) { const bb = await p.$eval('#' + id, c => { c.scrollIntoView(); const r = c.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height } }); if (!bb.width) { problems++; console.log('HIDDEN', id); continue } await p.screenshot({ path: path.join(out, 'el-' + scheme + '-' + id + '.png'), clip: bb, captureBeyondViewport: true }) }
  for (const sel of ['#mi-h', '#mi-s', '#ro-sc', '#ve-agree']) { const bb = await p.$eval(sel, x => { const c = x.closest('.card'); c.scrollIntoView(); const r = c.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height } }); await p.screenshot({ path: path.join(out, 'el-' + scheme + '-' + sel.slice(1) + '.png'), clip: bb, captureBeyondViewport: true }) }
  // tabs
  for (const t of ['t-roll', 't-more', 't-read']) { await p.click(`button[data-t=${t}]`); actions++; await bad(t) }
  await p.click('button[data-t=t-roll]');
  await clickAll('#ro-pick button', async () => { await p.evaluate(() => document.querySelector('#ro-tab tr[data-k]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))) });
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) errs.push('error box: ' + box);
  if (errs.length) { problems += errs.length; console.log('ERRORS', scheme, errs) }
  await p.close();
}
// normal motion: scroll every animation into view, wait, and confirm none moved by itself
{ const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 }); await p.goto('file://' + file);
  for (const id of ['rd-on', 'rd-gr', 'rd-cz', 'rd-as']) { await p.$eval('#' + id, e => e.scrollIntoView()); await new Promise(r => setTimeout(r, 1500)) }
  const moved = await p.$$eval('.an-ctl input[type=range]', xs => xs.filter(x => +x.value !== 0).map(x => x.id));
  if (moved.length) { problems++; console.log('AUTOPLAY', moved) } else console.log('no autoplay');
  await p.close() }
await b.close();
console.log('actions', actions, 'problems', problems);
