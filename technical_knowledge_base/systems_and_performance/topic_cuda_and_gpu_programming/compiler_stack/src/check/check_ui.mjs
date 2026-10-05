// Every control in every tab at 390 px dark and 920 px light: no errors, NaN, undefined or sideways scroll.
// Screenshots go to ../../.shots/ui-<width>-<tab>.png. Run from the repo root: node <this file>
import { createRequire } from 'module';
const require = createRequire(new URL('../../../../../../html_utils/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const url = new URL('../../index.html', import.meta.url).href;
const shots = new URL('../../.shots/', import.meta.url).pathname;
const fs = require('fs'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
let problems = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.setViewport({ width: w, height: 900 });
  await p.goto(url); await new Promise(r => setTimeout(r, 500));
  for (const t of ['t-read', 't-run', 't-sass', 't-tc', 't-more']) {
    await p.evaluate(t => document.querySelector(`#tabs button[data-t="${t}"]`).click(), t); await new Promise(r => setTimeout(r, 250));
    const n = await p.evaluate(async t => {
      const tab = document.getElementById(t); let clicks = 0; const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const s of tab.querySelectorAll('select')) { for (let i = 0; i < s.options.length; i++) { s.selectedIndex = i; s.dispatchEvent(new Event('change', { bubbles: true })); clicks++; await sleep(5) } s.selectedIndex = 0; s.dispatchEvent(new Event('change', { bubbles: true })) }
      for (const c of tab.querySelectorAll('input[type=checkbox]')) { c.click(); await sleep(5); c.click(); clicks += 2 }
      for (const btn of tab.querySelectorAll('button')) { if (btn.disabled || btn.offsetParent === null) continue; if (/Play|Pause/.test(btn.textContent)) continue; btn.click(); clicks++; await sleep(3) }
      for (const r of tab.querySelectorAll('input[type=range]')) { r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); r.value = Math.floor(r.max / 2); r.dispatchEvent(new Event('input', { bubbles: true })); clicks += 2 }
      if (t === 't-tc') { const ps = [...document.querySelectorAll('#tc-prog button')].map(b => b.dataset.m);
        for (const pm of ps) { document.querySelector(`#tc-prog button[data-m="${pm}"]`).click(); clicks++;
          const ss = [...document.querySelectorAll('#tc-stage button:not([disabled])')].map(b => b.dataset.m);
          for (const sm of ss) { document.querySelector(`#tc-stage button[data-m="${sm}"]`).click(); clicks++; await sleep(3) } } }
      if (t === 't-run') { const f = document.getElementById('run-fat'); f.value = 'custom'; f.dispatchEvent(new Event('change', { bubbles: true }));
        for (const c of [...document.querySelectorAll('#run-chips button')].map(b => b.dataset.t)) { document.querySelector(`#run-chips button[data-t="${c}"]`).click(); clicks++; await sleep(2) } }
      for (const d of tab.querySelectorAll('details')) d.open = true;
      for (const x of tab.querySelectorAll('[role=button],.cs-anat span,tr[data-i]')) { if (x.offsetParent === null) continue; x.click(); clicks++; if (clicks > 900) break }
      return clicks }, t);
    await new Promise(r => setTimeout(r, 200));
    const st = await p.evaluate(t => { const tab = document.getElementById(t); const txt = tab.innerText; return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, nan: (txt.match(/\bNaN\b/g) || []).length, und: (txt.match(/\bundefined\b/g) || []).length } }, t);
    await p.screenshot({ path: `${shots}ui-${w}-${t}.png`, fullPage: false });
    const bad = st.sw > st.cw || st.nan || st.und;
    if (bad) problems++;
    console.log(`${w} ${scheme} ${t}: ${n} controls exercised; scroll ${st.sw}/${st.cw}; NaN ${st.nan}; undefined ${st.und}${bad ? '  <-- PROBLEM' : ''}`);
  }
  const box = await p.$eval('#jsErr', e => e.hidden ? '' : e.textContent);
  if (errs.length || box) { problems++; console.log('errors', errs, box) }
  await p.close();
}
await b.close();
console.log(problems ? `PROBLEMS: ${problems}` : 'ui: all clear');
process.exit(problems ? 1 : 0);
