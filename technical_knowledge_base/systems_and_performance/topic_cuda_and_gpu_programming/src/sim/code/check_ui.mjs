// Exercise every control of the GPU simulator tab at 390 px (dark) and 920 px (light):
// every button, every select option, every range at min, middle and max, the animation controls.
// Fails on page errors, the error box, "NaN" or "undefined" in the tab's text, or sideways scroll.
// Usage: node code/check_ui.mjs   (puppeteer from html_utils/node_modules)
import {createRequire} from 'module';
import path from 'path';
import {fileURLToPath} from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const page = path.resolve(here, '..', '..', '..', 'index.html');
const repo = path.resolve(here, '..', '..', '..', '..', '..', '..');
const require = createRequire(path.join(repo, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
let fails = 0;
const b = await puppeteer.launch({headless: 'shell'});
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setViewport({width: w, height: 900});
  await p.emulateMediaFeatures([{name: 'prefers-color-scheme', value: scheme}]);
  await p.goto('file://' + page);
  await p.evaluate(() => document.querySelector('#tabs button[data-t="t-sim"]').click());
  await new Promise(r => setTimeout(r, 400));
  const n = await p.evaluate(async () => {
    const T = document.getElementById('t-sim');
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const bad = [];
    const check = where => {
      const t = T.innerText;
      if (/\bNaN\b|undefined|Infinity/.test(t)) bad.push('text at ' + where + ': ' + (t.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/) || [''])[0]);
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) bad.push('sideways scroll at ' + where);
      if (!document.getElementById('jsErr').hidden) bad.push('error box at ' + where);
    };
    let count = 0;
    const buttons = [...T.querySelectorAll('button')].filter(x => !x.closest('[data-sim-go]') && !x.dataset.simGo);
    for (const btn of buttons) {
      // reveal hidden parent controls by clicking the seg that shows them is handled by order; click anyway
      btn.click(); count++; await sleep(15); check('button ' + (btn.id || btn.textContent.trim().slice(0, 30)));
    }
    // free modes on, so their controls are live
    for (const id of ['sim-div-mode', 'sim-bank-mode', 'sim-lat-mode']) { const f = document.querySelector('#' + id + ' button[data-m="free"]'); if (f) f.click(); }
    for (const sel of T.querySelectorAll('select')) {
      for (const o of sel.options) { sel.value = o.value; sel.dispatchEvent(new Event('change', {bubbles: true})); count++; await sleep(10); check('select ' + sel.id + '=' + o.value);
        // with each option, sweep the ranges of the same card
        const card = sel.closest('.card');
        if (card && sel.id !== 'sim-occ-pre') for (const r of card.querySelectorAll('input[type=range]')) {
          for (const v of [r.min, Math.round((+r.min + +r.max) / 2), r.max]) { r.value = v; r.dispatchEvent(new Event('input', {bubbles: true})); count++; }
          check('ranges after ' + sel.id + '=' + o.value);
        }
      }
    }
    for (const r of T.querySelectorAll('input[type=range]')) for (const v of [r.min, r.max]) { r.value = v; r.dispatchEvent(new Event('input', {bubbles: true})); count++; check('range ' + r.id + '=' + v); }
    for (const c of T.querySelectorAll('input[type=checkbox]')) { c.click(); count++; check('checkbox ' + c.id); c.click(); }
    // step every animation to its end and back
    for (const ctl of T.querySelectorAll('.sim-ctl[id$="-ctl"]')) {
      const f = document.getElementById(ctl.id + '-f'), bk = document.getElementById(ctl.id + '-b'), s = document.getElementById(ctl.id + '-s');
      if (!f) continue;
      for (let i = 0; i < +s.max + 1; i++) { f.click(); count++; }
      check('anim end ' + ctl.id);
      bk.click(); bk.click(); count++;
      document.getElementById(ctl.id + '-p').click(); await sleep(60); document.getElementById(ctl.id + '-p').click();
      check('anim ' + ctl.id);
    }
    for (const b of T.querySelectorAll('[data-sim-go]')) { b.click(); count++; }
    return {count, bad};
  });
  console.log(w, scheme, 'controls exercised:', n.count, 'problems:', n.bad.length, n.bad.slice(0, 8).join(' | '), errs.length ? 'ERRORS ' + errs.join(' | ') : '');
  fails += n.bad.length + errs.length;
  await p.close();
}
await b.close();
process.exit(fails ? 1 : 0);
