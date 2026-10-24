// Browser check of every tab (since 2026-10-24: Reading and Further reading; the two labs moved into Reading) at 390 dark and 920 light: every segmented button, chip, checkbox, select option,
// animation step (in each mode) and predict button. Fails on script errors, NaN/undefined/Infinity in text,
// sideways scroll or a visible error box.
// usage: node check_page.mjs <index.html> <shots dir>   (puppeteer from html_utils via createRequire)
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, shots] = process.argv.slice(2); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
const TABS = ['t-read', 't-more'];
const PIECES = ['emb-hero-card', 'emb-sim-svg', 'emb-batch-svg', 'emb-mq-card', 'emb-tl-card', 'emb-ch-card', 'emb-pa-card', 'emb-fn-bars', 'emb-fn-ex', 'emb-ft-card', 'emb-pf-svg', 'emb-ln-svg', 'emb-ds-svg', 'emb-mt-svg', 'emb-sub-svg', 'emb-pool-tab', 'emb-code-pool', 'emb-tl-body', 'emb-ch-svg', 'emb-ch-tab', 'emb-ch-verdict'];
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  for (const tab of TABS) {
    await p.click(`button[data-t=${tab}]`); await new Promise(r => setTimeout(r, 250));
    const res = await p.evaluate(async (tab) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms)); const out = { clicks: 0, steps: 0, issues: [] };
      const root = document.getElementById(tab);
      const scan = where => { const t = root.innerText; for (const w of ['NaN', 'undefined', 'Infinity', '[object']) if (t.includes(w)) out.issues.push(w + ' after ' + where) };
      const side = where => { if (document.documentElement.scrollWidth > innerWidth + 1) out.issues.push('sideways after ' + where) };
      for (const ctl of root.querySelectorAll('[id$="-ctl"]')) {
        const card = ctl.parentElement; const segs = [...card.querySelectorAll('.seg button')]; const modes = segs.length ? segs : [null];
        for (const s of modes) {
          if (s) { s.click(); out.clicks++; await sleep(40) }
          const f = document.getElementById(ctl.id + '-f');
          if (f) { for (let i = 0; i < 160; i++) { f.click(); out.steps++ } await sleep(20); scan(ctl.id + ' end ' + (s ? s.textContent : '')) }
          const bk = document.getElementById(ctl.id + '-b'); if (bk) { bk.click(); out.clicks++ }
          side(ctl.id);
        }
        if (segs[0]) segs[0].click();
      }
      for (const s of root.querySelectorAll('.seg')) for (const btn of s.querySelectorAll('button')) { btn.click(); out.clicks++; await sleep(40); scan('seg ' + btn.textContent); side('seg ' + btn.textContent) }
      for (const c of root.querySelectorAll('.chips')) for (const btn of c.querySelectorAll('button')) { btn.click(); out.clicks++; await sleep(25); scan('chip ' + btn.textContent); side('chip ' + btn.textContent) }
      for (const c of root.querySelectorAll('input[type=checkbox]')) { c.click(); out.clicks++; await sleep(30); scan('checkbox ' + c.id); side('checkbox'); c.click(); await sleep(10) }
      for (const sel of root.querySelectorAll('select')) { if (sel.id.endsWith('-v')) continue; for (const o of sel.options) { sel.value = o.value; sel.dispatchEvent(new Event('change')); out.clicks++; await sleep(25); scan('select ' + sel.id + '=' + o.value); side(sel.id) } sel.selectedIndex = 0; sel.dispatchEvent(new Event('change')) }
      for (const r of root.querySelectorAll('input[type=range]')) { if (r.closest('.an-ctl')) continue; const v0 = r.value; for (let v = +r.min; v <= +r.max; v++) { r.value = v; r.dispatchEvent(new Event('input')); out.clicks++; await sleep(15); scan('range ' + r.id + '=' + v); side('range ' + r.id) } r.value = v0; r.dispatchEvent(new Event('input')) }
      for (const pb of root.querySelectorAll('.emb-prd button')) { pb.click(); out.clicks++; await sleep(20) }
      for (const a of root.querySelectorAll('.emb-prd .ans')) if (a.hidden) out.issues.push('answer not revealed');
      for (const d of root.querySelectorAll('details')) d.open = true;
      for (const s of root.querySelectorAll('.seg')) { const f = s.querySelector('button'); if (f) f.click() }
      const eb = document.getElementById('jsErr'); if (eb && !eb.hidden) out.issues.push('error box: ' + eb.textContent.slice(0, 200));
      window.scrollTo(0, 0); scan('all'); side('all');
      return out }, tab);
    await new Promise(r => setTimeout(r, 300));
    await (await p.$('#' + tab)).screenshot({ path: `${shots}/${tab}-${scheme}-${width}.png` });
    console.log(scheme, width, tab, 'clicks', res.clicks, 'steps', res.steps, 'issues', JSON.stringify([...new Set(res.issues)].slice(0, 12)));
    if (res.issues.length) bad = 1;
    for (const id of PIECES) { const el = await p.$('#' + tab + ' #' + id); if (el) { try { await el.screenshot({ path: `${shots}/piece-${id}-${scheme}-${width}.png` }) } catch (e) {} } }
  }
  if (errs.length) { console.log('ERRORS', errs.slice(0, 8)); bad = 1 }
  const links = await p.$$eval('#t-more a', as => as.length); console.log('further reading links', links);
  await p.close();
}
await b.close();
console.log(bad ? 'FAIL' : 'OK'); process.exit(bad);
