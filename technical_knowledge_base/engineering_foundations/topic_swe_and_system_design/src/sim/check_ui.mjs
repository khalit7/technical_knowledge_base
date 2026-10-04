// Exercise every control of the Scale simulator at 390 px dark and 920 px light.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/src/sim/check_ui.mjs
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const base = path.resolve('technical_knowledge_base/engineering_foundations/topic_swe_and_system_design');
const shots = path.join(base, '.shots'); fs.mkdirSync(shots, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let problems = [], actions = 0, slow = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  p.on('pageerror', e => problems.push(w + ' pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') problems.push(w + ' console ' + m.text()) });
  await p.goto('file://' + path.join(base, 'index.html'));
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await p.click('#tabs button[data-t="t-sim"]');
  const check = async (label) => {
    actions++;
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-sim'); const txt = t.innerText; const bad = [];
      if (/\bNaN\b/.test(txt)) bad.push('NaN'); if (/\bundefined\b/.test(txt)) bad.push('undefined'); if (/\[object /.test(txt)) bad.push('[object');
      const svgt = [...t.querySelectorAll('svg text')].map(x => x.textContent).join(' ');
      if (/NaN|undefined/.test(svgt)) bad.push('svg text NaN');
      if ([...t.querySelectorAll('svg [cx],svg [x],svg [width]')].some(e => /NaN/.test(e.getAttribute('cx') + e.getAttribute('x') + e.getAttribute('width')))) bad.push('svg attr NaN');
      const err = document.getElementById('jsErr'); if (err && !err.hidden) bad.push('errbox: ' + err.textContent.slice(0, 200));
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) bad.push('sideways ' + document.documentElement.scrollWidth);
      const sv = t.querySelector('#sm-svg svg'); if (sv && sv.getBoundingClientRect().right > t.getBoundingClientRect().right + 1) bad.push('svg overflows');
      // svg text must stay inside the svg
      if (sv) { const R = sv.getBoundingClientRect(); for (const x of sv.querySelectorAll('text')) { const b = x.getBoundingClientRect(); if (b.width && (b.left < R.left - 1 || b.right > R.right + 1)) { bad.push('svg text out: ' + x.textContent); break } } }
      return bad;
    });
    if (r.length) problems.push(w + ' ' + label + ': ' + r.join('; '));
  };
  await check('open');
  const presets = await p.$$eval('#sm-presets button', a => a.map(b => b.dataset.p));
  for (const id of presets) {
    await p.click(`#sm-presets button[data-p="${id}"]`); await check('preset ' + id);
    if (id === 'p4') await p.screenshot({ path: path.join(shots, `sim-p4-${scheme}-${w}.png`), fullPage: false });
    await p.click('#sm-view button[data-v="after"]').catch(() => {}); await check('after ' + id);
    await p.click('#sm-view button[data-v="now"]'); await check('now ' + id);
    for (let i = 0; i < 6; i++) {
      const dis = await p.$eval('#sm-apply', b => b.disabled); if (dis) break;
      const t0 = Date.now(); await p.click('#sm-apply'); await check(`apply ${id} ${i}`); if (Date.now() - t0 > 1500) slow++;
    }
    await p.click('#sm-undo'); await check('undo ' + id);
  }
  // users slider
  for (const v of [0, 150, 300, 450, 600, 650, 700]) { await p.$eval('#sm-u', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await check('users ' + v) }
  // open every group and move every control
  await p.$$eval('#t-sim details.sm-grp', a => a.forEach(d => d.open = true));
  const ctls = await p.$$eval('#sm-ctls [data-k]', a => a.map(e => [e.id, e.tagName, e.type, e.min, e.max, e.options ? e.options.length : 0]));
  for (const [id, tag, type, mn, mx, nopt] of ctls) {
    if (type === 'checkbox') { for (let k = 0; k < 2; k++) { await p.$eval('#' + id, e => { e.checked = !e.checked; e.dispatchEvent(new Event('input')) }); await check('toggle ' + id) } }
    else if (tag === 'SELECT') { for (let k = 0; k < nopt; k += 2) { await p.$eval('#' + id, (e, k) => { e.selectedIndex = k; e.dispatchEvent(new Event('input')) }, k); await check('select ' + id + ' ' + k) } }
    else { const a = +mn, b = +mx; for (const f of [0, 0.33, 0.66, 1]) { const vv = a + (b - a) * f; await p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, vv); await check('range ' + id + ' ' + f) } }
  }
  await p.click('#sm-anim'); await check('pause'); await p.click('#sm-anim'); await check('play');
  await p.click('#sm-presets button[data-p="p6"]'); await check('p6 again');
  const el = await p.$('#t-sim'); await el.screenshot({ path: path.join(shots, `sim-full-p6-${scheme}-${w}.png`) });
  await p.click('#sm-presets button[data-p="p3"]');
  const dia = await p.$('#sm-dia'); await dia.screenshot({ path: path.join(shots, `sim-dia-p3-${scheme}-${w}.png`) });
  await p.close();
}
await browser.close();
console.log(`actions ${actions}, slow ${slow}, problems ${problems.length}`); problems.slice(0, 30).forEach(x => console.log(x));
