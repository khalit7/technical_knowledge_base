// Click every control of every tab of the Pallas kernels page at 390 px dark and 920 px light; fail on script errors,
// on the error box, on "NaN", "undefined", "Infinity" in text the page's JavaScript writes (the prose mentions NaN on
// purpose, so the known phrases are allowed), on sideways page scroll, on SVGs past the right edge, and on any network
// request. Saves screenshots of the animated cards to the folder given.
// usage: NPM_CONFIG_USERCONFIG=<empty file> node src/check_ui.mjs <page index.html> <screenshot folder>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, outdir] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TABS = ['t-read', 't-pkgrid', 't-pkplay', 't-pktile', 't-more'];
const SHOTS = { 't-read': ['pk-be-card', 'pk-pipe-card', 'pk-pg-svg', 'pk-rpa-svg', 'pk-mg-bars', 'pk-ladder'], 't-pkgrid': ['pg-card'], 't-pkplay': ['kp-calc-card'], 't-pktile': ['ft-card'] };
let bad = 0, actions = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [], net = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  p.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) net.push(r.url()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  await sleep(400);
  const problems = [];
  for (const tab of TABS) {
    await p.click(`button[data-t=${tab}]`);
    await sleep(300);
    const check = async (what) => {
      actions++;
      const r = await p.evaluate((tab) => {
        const el = document.getElementById(tab);
        // text written by scripts: every element with an id that the source left empty, plus SVG text
        const dyn = [...el.querySelectorAll('[id]')].filter(e => !['SECTION', 'NAV'].includes(e.tagName)).map(e => e.innerText || e.textContent || '').join('\n')
          .replace(/dscale NaN|NaN rows|output NaN|: NaN|, NaN|NaN \(3 seeds\)/g, '');
        const side = document.documentElement.scrollWidth > innerWidth;
        const svgs = [...el.querySelectorAll('svg')].filter(s => { const q = s.getBoundingClientRect(); return q.width > 0 && q.right > innerWidth + 1 }).length;
        const err = (d => d && !d.hidden ? d.textContent : '')(document.getElementById('jsErr'));
        return { nan: /\bNaN\b|Infinity/.test(dyn), und: /\bundefined\b|\[object/.test(el.innerText), side, svgs, err };
      }, tab);
      if (r.nan || r.und || r.side || r.svgs || r.err) problems.push(`${tab} ${what} ${JSON.stringify(r)}`);
    };
    await check('open');
    // every button in the tab (skip tab buttons), then every select option, then every range at 0, middle, end
    const nb = await p.$$eval(`#${tab} button`, bs => bs.length);
    for (let i = 0; i < nb; i++) {
      const ok = await p.evaluate((tab, i) => { const x = document.querySelectorAll(`#${tab} button`)[i]; if (!x || x.offsetParent === null) return false; x.click(); return true }, tab, i);
      if (ok) await check('button ' + i);
    }
    // buttons created by clicks (kernel switches rebuild variant and order buttons): click those too
    const nb2 = await p.$$eval(`#${tab} button`, bs => bs.length);
    for (let i = 0; i < nb2; i++) {
      const ok = await p.evaluate((tab, i) => { const x = document.querySelectorAll(`#${tab} button`)[i]; if (!x || x.offsetParent === null) return false; x.click(); return true }, tab, i);
      if (ok) await check('button2 ' + i);
    }
    const sels = await p.$$eval(`#${tab} select`, ss => ss.map(s => s.options.length));
    for (let s = 0; s < sels.length; s++) for (let o = 0; o < sels[s]; o++) {
      await p.evaluate((tab, s, o) => { const x = document.querySelectorAll(`#${tab} select`)[s]; if (!x) return; x.selectedIndex = o; x.dispatchEvent(new Event('change', { bubbles: true })) }, tab, s, o);
      await check(`select ${s}:${o}`);
    }
    const nr = await p.$$eval(`#${tab} input[type=range]`, rs => rs.length);
    for (let i = 0; i < nr; i++) for (const f of [0, 0.5, 1]) {
      await p.evaluate((tab, i, f) => { const x = document.querySelectorAll(`#${tab} input[type=range]`)[i]; if (!x) return; x.value = Math.round(+x.min + f * (+x.max - +x.min)); x.dispatchEvent(new Event('input', { bubbles: true })) }, tab, i, f);
      await check(`range ${i} ${f}`);
    }
    if (tab === 't-read') {   // page-table cells
      const cells = await p.$$eval('#pk-pg-svg [data-pg]', g => g.length);
      for (let i = 0; i < cells; i += 5) { await p.evaluate(i => document.querySelectorAll('#pk-pg-svg [data-pg]')[i].dispatchEvent(new MouseEvent('click', { bubbles: true })), i); await check('page cell ' + i) }
    }
    // the kernel and mode switches in the labs, combined with stepping to the last step
    if (tab === 't-pkgrid' || tab === 't-pktile') {
      const segs = tab === 't-pkgrid' ? '#pg-kern button' : '#ft-mode button';
      const ns = await p.$$eval(segs, bs => bs.length);
      for (let i = 0; i < ns; i++) {
        await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), segs, i);
        const ctl = tab === 't-pkgrid' ? 'pg-ctl' : 'ft-ctl';
        await p.evaluate(c => { const r = document.getElementById(c + '-s'); r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })) }, ctl);
        await check('last step of ' + i);
      }
    }
    for (const id of SHOTS[tab] || []) {
      const h = await p.$('#' + id);
      if (h) { await p.evaluate(e => e.scrollIntoView({ block: 'center' }), h); await sleep(150); await h.screenshot({ path: path.join(outdir, `${id}-${scheme}-${width}.png`) }) }
    }
  }
  if (errs.length) problems.push('errors ' + JSON.stringify(errs.slice(0, 5)));
  if (net.length) problems.push('network ' + JSON.stringify(net.slice(0, 5)));
  console.log(scheme, width, problems.length ? 'FAIL' : 'ok', problems.slice(0, 12).join('\n'));
  if (problems.length) bad++;
  await p.close();
}
await b.close();
console.log('actions', actions, bad ? 'FAIL' : 'ALL OK');
process.exit(bad ? 1 : 0);
