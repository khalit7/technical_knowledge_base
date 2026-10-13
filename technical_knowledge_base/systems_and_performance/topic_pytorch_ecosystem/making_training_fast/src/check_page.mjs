// Browser check of every tab: every segmented control, every animation stepped to its end in every mode, every
// select option and slider extreme, every predict button, a click on trace bars, at 390 dark and 920 light.
// Fails on script errors, NaN/undefined/Infinity in text, sideways scroll, a visible error box.
// usage: node check_page.mjs <index.html> <shots dir>   (puppeteer from html_utils via createRequire)
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, shots] = process.argv.slice(2); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
const TABS = ['t-read', 't-trace', 't-attn', 't-mem', 't-more'];
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  for (const tab of TABS) {
    await p.click(`button[data-t=${tab}]`); await new Promise(r => setTimeout(r, 150));
    const res = await p.evaluate(async (tab) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms)); const out = { clicks: 0, steps: 0, issues: [] };
      const root = document.getElementById(tab);
      const scan = where => { const t = root.innerText; for (const w of ['NaN', 'undefined', 'Infinity', '[object', 'Does not match']) if (t.includes(w)) out.issues.push(w + ' after ' + where) };
      const side = where => { if (document.documentElement.scrollWidth > innerWidth + 1) out.issues.push('sideways after ' + where) };
      const cards = [...root.querySelectorAll('.rd-card, .card')];
      // top-level segs of the tab (outside cards) are cycled around each card
      const outer = [...root.querySelectorAll(':scope > .seg')];
      const outerSets = outer.length ? outer.map(s => [...s.querySelectorAll('button')]) : [];
      const combos = [[]]; for (const set of outerSets) { const n = []; for (const c of combos) for (const btn of set) n.push([...c, btn]); combos.splice(0, combos.length, ...n) }
      for (const combo of combos.slice(0, 24)) {
        for (const btn of combo) { btn.click(); out.clicks++; await sleep(30) }
        for (const c of cards) {
          c.scrollIntoView(); await sleep(30);
          const segs = [...c.querySelectorAll('.seg button')]; const modes = segs.length ? segs : [null];
          for (const s of modes) {
            if (s) { s.click(); out.clicks++; await sleep(30) }
            const fwd = c.querySelector('[id$="-ctl-f"]'), back = c.querySelector('[id$="-ctl-b"]'), sc = c.querySelector('[id$="-ctl-s"]');
            if (fwd) { for (let i = 0; i < 70; i++) { fwd.click(); out.steps++ } scan(c.id + ' end ' + (s ? s.textContent : '') + ' ' + combo.map(x => x.textContent).join('/')); back.click(); if (sc) { sc.value = 0; sc.dispatchEvent(new Event('input')) } }
            scan(c.id + ' ' + (s ? s.textContent : '')); side(c.id);
          }
        }
      }
      // loose segs (not in cards, not outer)
      for (const s of root.querySelectorAll('.seg')) { if (s.closest('.rd-card,.card') || outer.includes(s)) continue; for (const btn of s.querySelectorAll('button')) { btn.click(); out.clicks++; await sleep(20); scan('seg ' + btn.textContent) } }
      // selects and sliders
      for (const sel of root.querySelectorAll('select')) { if (sel.closest('.an-ctl')) continue; for (const o of sel.options) { sel.value = o.value; sel.dispatchEvent(new Event('change')); out.clicks++; await sleep(15); scan('select ' + sel.id + '=' + o.value); side(sel.id) } sel.selectedIndex = 0; sel.dispatchEvent(new Event('change')) }
      for (const r of root.querySelectorAll('input[type=range]')) { if (r.closest('.an-ctl')) continue; for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input')); out.clicks++; await sleep(15); scan('range ' + r.id + '=' + v); side(r.id) } }
      // trace bars
      const rects = [...root.querySelectorAll('rect[data-i]')]; for (const rr of rects.slice(0, 5)) { rr.dispatchEvent(new MouseEvent('click', { bubbles: true })); out.clicks++ }
      for (const pr of root.querySelectorAll('.pr')) { const bs = pr.querySelectorAll(".opts button"); if (!bs.length) { out.issues.push("predict without options"); continue } bs[0].click(); bs[bs.length - 1].click(); out.clicks += 2; if (pr.querySelector('.ans').hidden) out.issues.push('answer not revealed') }
      for (const d of root.querySelectorAll('details')) d.open = true;
      window.scrollTo(0, 0); scan('all'); side('all');
      // reset outer segs to their first button so screenshots show defaults
      for (const set of outerSets) if (set[0]) set[0].click();
      return out }, tab);
    await new Promise(r => setTimeout(r, 250));
    await (await p.$('#' + tab)).screenshot({ path: `${shots}/${tab}-${scheme}-${width}.png` });
    console.log(scheme, width, tab, 'clicks', res.clicks, 'steps', res.steps, 'issues', JSON.stringify([...new Set(res.issues)].slice(0, 12)));
    if (res.issues.length) bad = 1;
  }
  const more = await p.evaluate(() => ({ links: [...document.querySelectorAll('#t-more a')].map(a => a.href).filter(h => h.startsWith('http')).length, tabs: document.querySelectorAll('#t-more a[data-tab]').length }));
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  console.log(scheme, width, 'errors', JSON.stringify(errs.slice(0, 8)), 'errbox', JSON.stringify(box), 'more links', more.links, 'tab links', more.tabs);
  if (errs.length || box) bad = 1;
  await p.close();
}
await b.close(); process.exit(bad);
