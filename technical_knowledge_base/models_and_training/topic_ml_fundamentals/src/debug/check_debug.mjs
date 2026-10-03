// Exercise every control of the "When training goes wrong" tab at 390 px dark and 920 px light.
// Fails on page errors, the error box, NaN or undefined in SVG attributes, stray "undefined"/"null"/numeric NaN in text,
// sideways page scroll. Screenshots of each symptom go to ../../.shots/debug-*.png.
// usage: node check_debug.mjs   (puppeteer from html_utils: NODE_PATH=../../../../../html_utils/node_modules)
import { createRequire } from 'node:module';
const puppeteer = createRequire(new URL('../../../../../html_utils/', import.meta.url))('puppeteer');
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const file = path.resolve(here, '../../index.html'), shots = path.resolve(here, '../../.shots');
fs.mkdirSync(shots, {recursive: true});
const ALLOWED = [/Loss is NaN or inf/g, /NaN at step \d+/g, /turns? NaN/g, /every weight is NaN/g, /Step 2: NaN/g, /\bNaN: /g, /end in NaN/g, /A NaN never/g, /gradient NaN/g, /or turns NaN/g, /non-finite/g, /\bNaN mid-run/g, /NaN at step 2/g, /and NaN/g, /\bNaN\b(?= never)/g, /the NaN was hiding/g, /A NaN in one input row/g, /Step 2 of 60: NaN/g];
const b = await puppeteer.launch({headless: 'shell', executablePath: process.env.CHROME_PATH || undefined});
let bad = 0, clicks = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setViewport({width, height: 900});
  await p.emulateMediaFeatures([{name: 'prefers-color-scheme', value: scheme}]);
  await p.goto('file://' + file);
  await p.click('button[data-t=t-debug]'); await wait(300);
  const check = async (what) => {
    const r = await p.evaluate((allowed) => {
      const t = document.getElementById('t-debug'); const out = [];
      t.querySelectorAll('svg *').forEach(e => { for (const a of e.attributes) if (/NaN|undefined|Infinity/.test(a.value)) out.push(e.tagName + '@' + a.name + '=' + a.value.slice(0, 60)); });
      const cl = t.cloneNode(true); cl.querySelectorAll('.dg-nan').forEach(e => e.remove()); cl.style.position = 'absolute'; cl.style.left = '-9999px'; document.body.appendChild(cl); let txt = cl.innerText; cl.remove(); allowed.forEach(s => { txt = txt.replace(new RegExp(s[0], s[1]), ''); });
      const m = txt.match(/.{0,30}\b(undefined|null|NaN|Infinity)\b.{0,30}/g); if (m) out.push(...m.map(x => 'text: ' + x));
      if (document.documentElement.scrollWidth > innerWidth) out.push('sideways scroll ' + document.documentElement.scrollWidth);
      const box = document.getElementById('jsErr'); if (box && !box.hidden) out.push('error box: ' + box.textContent.slice(0, 200));
      return out;
    }, ALLOWED.map(r => [r.source, r.flags]));
    if (r.length || errs.length) { bad++; console.log('FAIL', scheme, width, what, JSON.stringify(r.slice(0, 5)), errs.splice(0)); }
  };
  await check('open');
  const syms = await p.$$eval('#dg-syms button', bs => bs.map(b => b.dataset.sy));
  for (const sy of syms) {
    await p.click('#dg-syms button[data-sy="' + sy + '"]'); clicks++; await wait(60); await check('symptom ' + sy);
    const n = await p.$$eval('#dg-det .dg-cause > button', bs => bs.length);
    for (let i = 0; i < n; i++) {
      await p.click('#dg-det .dg-cause > button[data-ci="' + i + '"]'); clicks++; await wait(40); await check(sy + ' cause ' + i);
      for (const v of ['bug', 'fix', 'both']) { const h = await p.$('#dg-view:not([hidden]) button[data-v="' + v + '"]'); if (h) { await h.click(); clicks++; await wait(30); await check(sy + ' cause ' + i + ' view ' + v); } }
    }
    const el = await p.$('#dg-det'); await el.screenshot({path: path.join(shots, 'debug-' + sy + '-' + scheme + '-' + width + '.png')});
  }
  const cells = await p.$$('#dg-map td button'); for (let i = 0; i < cells.length; i++) { const c = (await p.$$('#dg-map td button'))[i]; await c.click(); clicks++; await wait(20); }
  await check('map cells');
  const rows = await p.$$('#dg-map th a[data-sy]'); for (let i = 0; i < rows.length; i++) { const c = (await p.$$('#dg-map th a[data-sy]'))[i]; await c.click(); clicks++; await wait(20); }
  await check('map rows');
  const tiles = await p.$$('#dg-gal .dg-tile:not([disabled])'); for (let i = 0; i < tiles.length; i++) { const t = (await p.$$('#dg-gal .dg-tile:not([disabled])'))[i]; await t.click(); clicks++; await wait(40); await check('tile ' + i); }
  for (const m of ['van', 'exp', 'spk']) {
    await p.click('#dg-am button[data-m="' + m + '"]'); clicks++; await wait(400); await check('anim ' + m + ' playing');
    await p.click('#dg-aplay'); clicks++;
    const max = await p.$eval('#dg-ascrub', e => +e.max);
    for (const v of [0, 1, 2, Math.floor(max / 3), Math.floor(max / 2), max - 1, max]) { await p.$eval('#dg-ascrub', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')); }, v); clicks++; await check('anim ' + m + ' frame ' + v); }
    await p.click('#dg-aback'); await p.click('#dg-afwd'); await p.click('#dg-afwd'); clicks += 3; await check('anim ' + m + ' steps');
    await p.select('#dg-aspd', '4'); clicks++;
    const el = await p.$('#dg-anim'); await el.screenshot({path: path.join(shots, 'debug-anim-' + m + '-' + scheme + '-' + width + '.png')});
  }
  for (const k of await p.$$eval('#dg-kp button', bs => bs.map(b => b.dataset.k))) { await p.click('#dg-kp button[data-k="' + k + '"]'); clicks++; await check('K ' + k); }
  await p.$eval('#dg-k', e => { e.value = '7'; e.dispatchEvent(new Event('input')); }); clicks++; await check('K typed');
  for (const v of await p.$$eval('#dg-spv button', bs => bs.map(b => b.dataset.v))) {
    await p.click('#dg-spv button[data-v="' + v + '"]'); clicks++;
    for (const s of ['loss', 'gnorm', 'maxlogit']) { await p.select('#dg-sps', s); clicks++; await check('spike ' + v + ' ' + s); }
  }
  for (const [id, vals] of [['dg-spw', [20, 100, 500]], ['dg-spk', [3, 7, 10]]]) for (const v of vals) { await p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')); }, v); clicks++; await check(id + ' ' + v); }
  // the Training lab link switches tab
  await p.click('#dg-syms button[data-sy="osc"]'); await p.click('#dg-det .dg-cause > button[data-ci="0"]'); await p.click('#dg-det .dg-tablink'); clicks += 3; await wait(100);
  const onLab = await p.$eval('#t-lab', e => !e.hidden); if (!onLab) { bad++; console.log('FAIL lab link did not open t-lab'); }
  await p.click('button[data-t=t-debug]'); await wait(200);
  for (const sec of ['dg-h-recipe', 'dg-h-spike']) { await p.$eval('#' + sec, e => e.scrollIntoView()); }
  const tabEl = await p.$('#t-debug'); await tabEl.screenshot({path: path.join(shots, 'debug-full-' + scheme + '-' + width + '.png')});
  await check('final');
  console.log(scheme, width, 'clicks', clicks, 'frames animated', await p.$eval('#dg-anim', e => e.dataset.frames || 0));
  await p.close();
}
await b.close();
console.log(bad ? 'check_debug: FAIL ' + bad : 'check_debug: ok, ' + clicks + ' clicks');
process.exit(bad ? 1 : 0);
