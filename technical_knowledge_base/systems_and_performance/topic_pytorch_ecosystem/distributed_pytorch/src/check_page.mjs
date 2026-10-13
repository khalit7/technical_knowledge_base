// Browser check of every tab at 390 dark and 920 light: every segmented button, checkbox, select option, slider
// extreme, mesh rank, animation step (each mode) and predict button. Fails on script errors, NaN/undefined/Infinity
// in text, sideways scroll or a visible error box.
// usage: node check_page.mjs <index.html> <shots dir>   (puppeteer from html_utils via createRequire)
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, shots] = process.argv.slice(2); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
const TABS = ['t-read', 't-dpt-hook', 't-dpt-mesh', 't-dpt-pipe', 't-more'];
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  for (const tab of TABS) {
    await p.click(`button[data-t=${tab}]`); await new Promise(r => setTimeout(r, 200));
    const res = await p.evaluate(async (tab) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms)); const out = { clicks: 0, steps: 0, issues: [] };
      const root = document.getElementById(tab);
      const scan = where => { const t = root.innerText; for (const w of ['NaN', 'undefined', 'Infinity', '[object']) if (t.includes(w)) out.issues.push(w + ' after ' + where) };
      const side = where => { if (document.documentElement.scrollWidth > innerWidth + 1) out.issues.push('sideways after ' + where) };
      // animations: every mode of each card's seg, stepped to the end
      for (const ctl of root.querySelectorAll('[id$="-ctl"]')) {
        const card = ctl.parentElement; const segs = [...card.querySelectorAll('.seg button')]; const modes = segs.length ? segs : [null];
        for (const s of modes) {
          if (s) { s.click(); out.clicks++; await sleep(30) }
          const f = document.getElementById(ctl.id + '-f');
          if (f) { for (let i = 0; i < 30; i++) { f.click(); out.steps++; await sleep(5) } scan(ctl.id + ' end ' + (s ? s.textContent : '')) }
          side(ctl.id);
        }
        if (segs[0]) segs[0].click();
      }
      for (const s of root.querySelectorAll('.seg')) for (const btn of s.querySelectorAll('button')) { btn.click(); out.clicks++; await sleep(40); scan('seg ' + btn.textContent); side('seg ' + btn.textContent)
        // mesh: click every rank of every layout
        if (tab === 't-dpt-mesh' && s.id === 'dm-lay') for (const c of root.querySelectorAll('.dm-cell')) { const r = c.dataset.r; root.querySelector('.dm-cell[data-r="' + r + '"]').click(); out.clicks++; await sleep(10); scan('mesh ' + btn.textContent + ' rank ' + r); side('mesh rank') } }
      for (const c of root.querySelectorAll('input[type=checkbox]')) { if (c.disabled) continue; c.click(); out.clicks++; await sleep(20); scan('checkbox ' + (c.id || c.dataset.i)); c.click(); await sleep(10) }
      for (const sel of root.querySelectorAll('select')) { if (sel.closest('.an-ctl') && !sel.id.startsWith('dp-')) continue; for (const o of sel.options) { sel.value = o.value; sel.dispatchEvent(new Event('change')); out.clicks++; await sleep(20); scan('select ' + sel.id + '=' + o.value); side(sel.id) } sel.selectedIndex = sel.id === 'dh-mcr' ? 1 : 0; sel.dispatchEvent(new Event('change')) }
      for (const r of root.querySelectorAll('input[type=range]')) { if (r.closest('.an-ctl') && !r.id.startsWith('dp-')) continue; for (const v of [r.min, r.max, Math.round((+r.min + +r.max) / 2)]) { r.value = v; r.dispatchEvent(new Event('input')); out.clicks++; await sleep(15); scan('range ' + r.id + '=' + v); side(r.id) } }
      const play = root.querySelector('#dp-play'); if (play) { play.click(); await sleep(400); play.click(); out.clicks += 2; scan('pipe play') }
      for (const pr of root.querySelectorAll('.pr')) { const bs = pr.querySelectorAll('.opts button'); bs[0].click(); bs[bs.length - 1].click(); out.clicks += 2; if (pr.querySelector('.ans').hidden) out.issues.push('answer not revealed') }
      for (const d of root.querySelectorAll('details')) d.open = true;
      for (const s of root.querySelectorAll('.seg')) { const f = s.querySelector('button'); if (f) f.click() }
      const sc = document.getElementById('dp-scrub'); if (sc && tab === 't-dpt-pipe') { sc.value = 1000; sc.dispatchEvent(new Event('input')) }
      const eb = document.getElementById('jsErr'); if (eb && !eb.hidden) out.issues.push('error box: ' + eb.textContent.slice(0, 200));
      window.scrollTo(0, 0); scan('all'); side('all');
      return out }, tab);
    await new Promise(r => setTimeout(r, 250));
    await (await p.$('#' + tab)).screenshot({ path: `${shots}/${tab}-${scheme}-${width}.png` });
    console.log(scheme, width, tab, 'clicks', res.clicks, 'steps', res.steps, 'issues', JSON.stringify([...new Set(res.issues)].slice(0, 12)));
    if (res.issues.length) bad = 1;
  }
  if (errs.length) { console.log('ERRORS', errs.slice(0, 8)); bad = 1 }
  const links = await p.$$eval('#t-more a', as => as.length); console.log('further reading links', links);
  await p.close();
}
await b.close();
console.log(bad ? 'FAIL' : 'OK'); process.exit(bad);
