// Click every control of every tab at 390 dark and 920 light; report page errors, NaN/undefined text and
// sideways scroll; screenshot every section and card. Run from the repo root:
//   node technical_knowledge_base/engineering_foundations/topic_operating_systems/processes_and_syscalls/src/check_ui.mjs <outdir>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve('technical_knowledge_base/engineering_foundations/topic_operating_systems/processes_and_syscalls/index.html');
const out = process.argv[2] || '.';
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page);
  const tabs = await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t));
  const checkText = async (tab, label) => {
    const t = await p.$eval('#' + tab, e => e.innerText);
    for (const w of ['NaN', 'undefined', 'Infinity', '[object', 'null']) {
      const re = w === 'null' ? /(?<!\/dev\/)\bnull\b/ : new RegExp('\\b' + w.replace('[', '\\[') + (w === '[object' ? '' : '\\b'));
      const m = t.match(re);
      if (m) errs.push(label + ': text contains ' + w + ' near "' + t.slice(Math.max(0, m.index - 60), m.index + 20).replace(/\n/g, ' ') + '"');
    }
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (sw) errs.push(label + ': sideways scroll (' + await p.evaluate(() => document.documentElement.scrollWidth) + ')');
  };
  for (const tab of tabs) {
    await p.click('button[data-t=' + tab + ']'); await sleep(250);
    // segmented controls: click each button, and after each, drive every animation control in the tab
    const segIds = await p.$$eval('#' + tab + ' .seg[id]', ss => ss.map(s => s.id));
    const ctlIds = await p.$$eval('#' + tab + ' .an-ctl[id]', cs => cs.map(c => c.id));
    const drive = async () => {
      for (const c of ctlIds) {
        for (let k = 0; k < 30; k++) await p.click('#' + c + '-f').catch(() => {});
        await p.click('#' + c + '-b').catch(() => {});
        await p.$eval('#' + c + '-s', e => { e.value = 0; e.dispatchEvent(new Event('input')) }).catch(() => {});
        await p.$eval('#' + c + '-v', e => { e.value = '2'; e.dispatchEvent(new Event('change')) }).catch(() => {});
        await p.click('#' + c + '-p').catch(() => {}); await sleep(40); await p.click('#' + c + '-p').catch(() => {});
      }
    };
    await drive(); await checkText(tab, tab + ' initial');
    for (const s of segIds) {
      const n = await p.$$eval('#' + s + ' button', bs => bs.length);
      for (let i = 0; i < n; i++) {
        await p.$$eval('#' + s + ' button', (bs, i) => bs[i].click(), i); await sleep(60);
        await drive(); await checkText(tab, tab + ' ' + s + ' #' + i);
      }
    }
    // other buttons (not tabs, not seg, not anim): lab buttons, drills
    const nb = await p.$$eval('#' + tab + ' button', bs => bs.length);
    for (let i = 0; i < nb; i++) {
      await p.$$eval('#' + tab + ' button', (bs, i) => { const b = bs[i]; if (!b.closest('.seg') && !b.closest('.an-ctl') && b.offsetParent) b.click() }, i);
    }
    await sleep(100); await checkText(tab, tab + ' buttons');
    // selects and inputs
    const sels = await p.$$eval('#' + tab + ' select[id]', s => s.filter(x => !x.closest('.an-ctl')).map(x => x.id));
    for (const sid of sels) {
      const vals = await p.$$eval('#' + sid + ' option', os => os.map(o => o.value));
      for (const v of vals) { await p.select('#' + sid, v); await sleep(40); await checkText(tab, tab + ' select ' + sid + '=' + v); }
    }
    const inps = await p.$$eval('#' + tab + ' input[type=text][id], #' + tab + ' input:not([type])[id]', s => s.map(x => x.id));
    for (const iid of inps) {
      for (const v of ['ffffffffffffffff', 'zz', '', '1']) { await p.$eval('#' + iid, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await sleep(40); await checkText(tab, tab + ' input ' + iid + '=' + v); }
    }
    const ranges = await p.$$eval('#' + tab + ' input[type=range][id]', s => s.filter(x => !x.closest('.an-ctl')).map(x => x.id));
    for (const rid of ranges) {
      for (const f of [0, 0.5, 1]) { await p.$eval('#' + rid, (e, f) => { e.value = +e.min + f * (+e.max - +e.min); e.dispatchEvent(new Event('input')) }, f); await sleep(40); await checkText(tab, tab + ' range ' + rid); }
    }
    await p.$$eval('#' + tab + ' details', ds => ds.forEach(d => d.open = true));
    await checkText(tab, tab + ' final');
    // screenshots
    const els = await p.$$('#' + tab + ' section, #' + tab + ' > .card, #' + tab + ' .lab-sec');
    let k = 0;
    for (const el of els) { const bb = await el.boundingBox(); if (bb && bb.height > 10) { await el.screenshot({ path: path.join(out, `${tab}-${scheme}-${width}-${String(k).padStart(2, '0')}.png`) }).catch(() => {}); k++ } }
    if (!els.length) await (await p.$('#' + tab)).screenshot({ path: path.join(out, `${tab}-${scheme}-${width}.png`) });
  }
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) errs.push('error box: ' + box);
  console.log(scheme, width, errs.length ? errs.slice(0, 15) : 'ok');
  if (errs.length) bad = 1;
  await p.close();
}
await b.close();
process.exit(bad);
