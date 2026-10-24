// Click every control of the Dedup lab (t-dedup) at 390 px dark and 920 px light; fail on script errors, on "NaN" or
// "undefined" in the tab's text, and on sideways scroll. Screenshots (whole tab and each section) go to the folder given.
// usage: node src/dedup/check_tab.mjs <page index.html> <screenshot folder>
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, outdir] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
const T = '#t-dedup';
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  await p.click('button[data-t=t-dedup]');
  await new Promise(r => setTimeout(r, 400));
  const problems = [];
  const check = async (what) => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-dedup').innerText;
      return { nan: /\bNaN\b|Infinity/.test(t), und: /\bundefined\b|\bnull\b/.test(t), side: document.documentElement.scrollWidth > innerWidth,
        err: (d => d && !d.hidden ? d.textContent : '')(document.getElementById('jsErr')) };
    });
    if (r.nan || r.und || r.side || r.err) problems.push(what + ' ' + JSON.stringify(r));
  };
  const clickAll = async (sel, label) => {
    const n = await p.$$eval(T + ' ' + sel, bs => bs.length);
    for (let i = 0; i < n; i++) {
      await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), T + ' ' + sel, i);
      await new Promise(r => setTimeout(r, 20));
      await check(label + ' ' + i);
    }
    return n;
  };
  await check('initial');
  await clickAll('.seg button', 'seg');
  await clickAll('.dd-steps button', 'step');
  await clickAll('.dd-anctl button', 'anim');
  await clickAll('.dd-list button', 'cluster');
  for (let i = 0; i < 20; i++) await p.evaluate(() => document.getElementById('dd-bf-next').click());
  await check('bloom fed');
  await clickAll('.pr .opts button', 'predict');
  const sels = await p.$$eval(T + ' select', s => s.map(x => x.id));
  for (const id of sels) {
    const opts = await p.$eval('#' + id, s => s.options.length);
    for (let o = 0; o < opts; o++) {
      await p.evaluate((id, o) => { const s = document.getElementById(id); s.selectedIndex = o; s.dispatchEvent(new Event('change')) }, id, o);
      await check('select ' + id + ' ' + o);
    }
  }
  const ranges = await p.$$eval(T + ' input[type=range]', s => s.map(x => [x.id, +x.min, +x.max, +x.step || 1]));
  for (const [id, mn, mx, st] of ranges) {
    if (!id) continue;
    const n = Math.round((mx - mn) / st);
    for (let k = 0; k <= n; k += Math.max(1, Math.floor(n / 12))) {
      const v = mn + k * st;
      await p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input')) }, id, v);
      await check('range ' + id + ' ' + v);
    }
  }
  // restore defaults that the screenshots should show
  await p.evaluate(() => { const s = document.getElementById('dd-sc-pre'); if (s) { s.value = '14,8'; s.dispatchEvent(new Event('change')); } });
  await p.evaluate(() => document.querySelectorAll('#t-dedup details').forEach(d => d.open = true));
  await check('opened');
  await new Promise(r => setTimeout(r, 900));
  await p.screenshot({ path: path.join(outdir, `dd-${scheme}-${width}.png`), fullPage: true });
  for (const id of await p.$$eval(T + ' section', ss => ss.map(x => x.id))) {
    const el = await p.$('#' + id); await el.screenshot({ path: path.join(outdir, `dd-${scheme}-${width}-${id}.png`) });
  }
  if (errs.length || problems.length) { bad++; console.log(scheme, width, 'ERRORS', errs.slice(0, 5), problems.slice(0, 8)); }
  else console.log(scheme, width, 'ok');
  await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
