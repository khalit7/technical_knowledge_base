// Clicks every control of every tab at 390 px dark and 920 px light, walks every model through the Decode tab and its
// animation, and fails on page errors, a visible #jsErr, sideways scroll, or NaN / undefined / Infinity
// in a tab's text. Then checks that nothing autoplays, with and without prefers-reduced-motion. Optional screenshots of the main
// cards go to the folder given as the second argument (outside the repo).
// Run from the repo root: node <page>/src/checks/check_controls.mjs <page>/index.html [shots dir]
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(process.argv[2]), shots = process.argv[3];
if (shots) fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
async function textBad(p, t) { return p.$eval('#' + t, el => { const m = el.innerText.match(/\bNaN\b|\bundefined\b|\bInfinity\b|\bnull B\b/); return m ? m[0] + ' near "' + el.innerText.slice(Math.max(0, m.index - 60), m.index + 30).replace(/\s+/g, ' ') + '"' : '' }) }
const side = p => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push('console ' + m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page);
  const tabs = await p.$$eval('#tabs button[data-t]', bs => bs.map(x => x.dataset.t));
  for (const t of tabs) {
    await p.click(`#tabs button[data-t=${t}]`); await sleep(150);
    // buttons inside the tab (segmented controls, chips, drills, animation controls), twice through
    const nb = await p.$$eval('#' + t + ' button', bs => bs.length);
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < nb; i++) {
      await p.evaluate((t, i) => { const x = document.querySelectorAll('#' + t + ' button')[i]; if (x && x.offsetParent) x.click() }, t, i);
      if (i % 12 === 0) await sleep(20);
    }
    await sleep(200);
    // ranges: min, max, middle
    await p.$$eval('#' + t + ' input[type=range]', rs => rs.forEach(r => { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })) } }));
    // checkboxes both ways
    await p.$$eval('#' + t + ' input[type=checkbox]', cs => cs.forEach(c => { for (let k = 0; k < 2; k++) { c.checked = !c.checked; c.dispatchEvent(new Event('change', { bubbles: true })); c.dispatchEvent(new Event('input', { bubbles: true })) } }));
    // selects: every option (the Decode tab walks all models and checks each one's text)
    const sels = await p.$$eval('#' + t + ' select', ss => ss.map(s => s.id));
    for (const id of sels) {
      const n = await p.$eval('#' + id, s => s.options.length);
      for (let k = 0; k < n; k++) {
        await p.$eval('#' + id, (s, k) => { s.selectedIndex = k; s.dispatchEvent(new Event('change', { bubbles: true })) }, k);
        if (id === 'dc-sel') {
          await p.$eval('#dc-anCtl-s', r => { r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })) });
          const bad = await textBad(p, t); if (bad) errs.push(`${t} ${id}[${k}]: ${bad}`);
        }
      }
      await p.$eval('#' + id, s => { s.selectedIndex = 0; s.dispatchEvent(new Event('change', { bubbles: true })) });
    }
    await sleep(150);
    const bad = await textBad(p, t); if (bad) errs.push(`${t}: ${bad}`);
    if (await side(p)) errs.push(`${t}: sideways scroll`);
    // SVG text running past its own svg box
    const over = await p.$$eval('#' + t + ' svg', ss => { const o = []; ss.forEach(s => { if (!s.offsetParent) return; const bb = s.getBoundingClientRect(); s.querySelectorAll('text').forEach(x => { const r = x.getBoundingClientRect(); if (r.width && (r.right > bb.right + 2 || r.left < bb.left - 2)) o.push(x.textContent.slice(0, 30)) }) }); return o.slice(0, 5) });
    if (over.length) errs.push(`${t}: svg text outside its box: ${over.join(' | ')}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('jsErr: ' + box);
  if (shots) {
    await p.click('#tabs button[data-t=t-read]'); await sleep(300);
    for (const id of ['ag-hero', 'ag-cen', 'ag-corr', 'ag-sm', 'ag-spread', 'ag-t6', 'ag-w7', 'ag-ratio', 'ag-t8', 'ag-moe', 'ag-t9', 'ag-stack']) { const el = await p.$('#' + id); if (el) { await el.scrollIntoView(); await sleep(250); await el.screenshot({ path: path.join(shots, `${id}-${scheme}-${width}.png`) }) } }
    await p.click('#tabs button[data-t=t-dec]'); await p.$eval('#dc-sel', s => { s.value = 'Kimi K3'; s.dispatchEvent(new Event('change', { bubbles: true })) }); await sleep(300);
    for (const id of ['dc-card', 'dc-out', 'dc-an']) { const el = await p.$('#' + id); if (el) { await el.scrollIntoView(); await el.screenshot({ path: path.join(shots, `${id}-${scheme}-${width}.png`) }) } }
    await p.click('#tabs button[data-t=t-cmp]'); await sleep(300); for (const id of ['cm-scc', 'cm-t']) { const el = await p.$('#' + id); if (el) await el.screenshot({ path: path.join(shots, `${id}-${scheme}-${width}.png`) }) }
  }
  console.log(scheme, width, errs.length ? errs : 'clean'); fails += errs.length; await p.close();
}
// nothing may start playing on its own, with or without reduced motion (the only animation is the Decode tab's)
for (const motion of ['reduce', 'no-preference']) {
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: motion }]);
  await p.goto('file://' + page); const res = [];
  for (const [t, card, btn] of [['t-dec', 'dc-an', '#dc-anCtl-p']]) {
    await p.click(`#tabs button[data-t=${t}]`); await p.$eval('#' + card, e => e.scrollIntoView()); await sleep(1500);
    const txt = await p.$eval(btn, x => x.textContent); if (/Pause/.test(txt)) res.push(`${card} autoplays (${motion})`);
  }
  console.log('motion ' + motion, res.length ? res : 'clean'); fails += res.length; await p.close();
}
await b.close();
process.exit(fails ? 1 : 0);
