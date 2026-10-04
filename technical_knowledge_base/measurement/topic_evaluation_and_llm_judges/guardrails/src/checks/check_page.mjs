// Exercise every control at 390 px dark and 920 px light; fail on errors, NaN, undefined, null text or sideways scroll.
// Takes element screenshots into ../.shots/el-*.png and dumps the page's computations to checks/js_out.json for recompute.py.
// usage (from src/): node checks/check_page.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = 'file://' + path.resolve(here, '../../index.html');
const shots = path.resolve(here, '../../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
let problems = [], actions = 0, out = {};
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(page); await wait(300);
  const bad = async (where) => {
    const r = await p.evaluate(() => {
      const t = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' ');
      const m = t.match(/NaN|undefined|\bnull\b|Infinity/); return { m: m ? t.slice(Math.max(0, m.index - 60), m.index + 40) : '', sw: document.documentElement.scrollWidth > innerWidth, box: document.getElementById('jsErr').hidden ? '' : document.getElementById('jsErr').textContent };
    });
    if (r.m) problems.push(`${scheme}${width} ${where}: bad text "${r.m}"`);
    if (r.sw) problems.push(`${scheme}${width} ${where}: sideways scroll`);
    if (r.box) problems.push(`${scheme}${width} ${where}: error box ${r.box}`);
  };
  const tabs = await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t));
  for (const t of tabs) {
    await p.click(`#tabs button[data-t="${t}"]`); await wait(150); await bad('open ' + t);
    // every button inside the visible tab
    const n = await p.$$eval(`#${t} button`, bs => bs.length);
    for (let i = 0; i < n; i++) {
      await p.evaluate((t, i) => { const el = document.querySelectorAll(`#${t} button`)[i]; if (el && !el.disabled) el.dispatchEvent(new MouseEvent('click', { bubbles: true })) }, t, i);
      actions++; if (i % 4 === 0) await bad(`${t} button ${i}`);
    }
    // every select, every option
    const sels = await p.$$eval(`#${t} select`, ss => ss.map(s => [s.id, s.options.length]));
    for (const [id, k] of sels) for (let j = 0; j < k; j++) {
      await p.evaluate((id, j) => { const s = document.getElementById(id); if (!s || s.disabled) return; s.selectedIndex = j; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })) }, id, j);
      actions++; await bad(`${t} select ${id}=${j}`);
    }
    // every range: min, middle, max, then back to its default
    const rs = await p.$$eval(`#${t} input[type=range]`, rr => rr.map(r => [r.id, r.min, r.max, r.value]));
    for (const [id, lo, hi, v0] of rs) for (const v of [lo, (+lo + +hi) / 2, hi, v0]) {
      await p.evaluate((id, v) => { const r = document.getElementById(id); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })) }, id, String(v));
      actions++; await bad(`${t} range ${id}=${v}`);
    }
    await bad('end ' + t);
  }
  // reload to defaults for the dump and the screenshots
  await p.goto(page); await wait(300);
  if (width === 920) {
    out = await p.evaluate(() => {
      const T = c => GR.tally(c);
      const crcAt = (a, seed) => { document.getElementById('pl-a').value = a; document.getElementById('pl-a').dispatchEvent(new Event('input')); return +document.getElementById('pl-crc').dataset.lam };
      return {
        tally: { none: T({}), sys: T({ sys: true }), inLoose: T({ inp: 'loose' }), outLoose: T({ out: 'loose' }), bothLoose: T({ inp: 'loose', out: 'loose' }), inStrict: T({ inp: 'strict' }), outStrict: T({ out: 'strict' }), bothStrict: T({ inp: 'strict', out: 'strict' }), in05: T({ inp: 0.5 }), pi05: T({ pi: 0.5 }) },
        indep: GR.indep, stream: GR.stream, brShare: +document.getElementById('rd-br').dataset.share,
        lat: { total: +document.getElementById('rd-lc').dataset.total, bed: +document.getElementById('rd-lc').dataset.bed, arm: +document.getElementById('rd-lc').dataset.arm },
        crc05: crcAt(0.05), crc10: crcAt(0.1), sc: SC.view, piTable: [document.getElementById('rd-pi-ours1v').textContent, document.getElementById('rd-pi-ours2v').textContent]
      };
    });
    await p.goto(page); await wait(300);
  }
  // element screenshots
  for (const [t, ids] of [['t-read', ['rd-onetab', 'rd-br', 'rd-qp', 'rd-pii', 'rd-st', 'rd-qr', 'rd-pa', 'rd-lc', 'rd-gm']], ['t-pipe', ['pl-ctl', 'pl-cv', 'pl-crc', 'pl-ref', 'pl-list']], ['t-card', ['sc-chart', 'sc-spread', 'sc-mtab']]]) {
    await p.click(`#tabs button[data-t="${t}"]`); await wait(200);
    for (const id of ids) {
      const el = await p.$('#' + id); if (!el) { problems.push('missing #' + id); continue }
      await el.evaluate(e => e.scrollIntoView()); await wait(250);
      if (id === 'rd-pa') { for (let k = 0; k < 3; k++) await p.click('#rd-pa-ctl-f'); await wait(600) }
      await el.screenshot({ path: `${shots}/el-${id}-${scheme}${width}.png` });
    }
  }
  if (errs.length) problems.push(...errs.map(e => `${scheme}${width} console: ${e}`));
  await p.close();
}
await b.close();
fs.writeFileSync(path.resolve(here, 'js_out.json'), JSON.stringify(out, null, 1));
console.log('actions', actions, 'problems', problems.length); problems.slice(0, 40).forEach(x => console.log(' ', x));
process.exit(problems.length ? 1 : 0);
