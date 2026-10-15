// Click every control of the Tool map (t-map) at 390 px dark and 920 px light; fail on script errors, on "NaN" or
// "undefined" in the tab's text, on sideways page scroll, and on any network request. Screenshots go to the folder given.
// usage: node src/map/check_tab.mjs <page index.html> <screenshot folder>
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, outdir] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [], net = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  p.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) net.push(r.url()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  await p.click('button[data-t=t-map]');
  await sleep(500);
  const problems = [];
  const check = async (what) => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-map').innerText;
      const side = document.documentElement.scrollWidth > innerWidth;
      return { nan: /\bNaN\b/.test(t), und: /\bundefined\b|\bnull\b/.test(t), side, err: (d => d && !d.hidden ? d.textContent : '')(document.getElementById('jsErr')) };
    });
    if (r.nan || r.und || r.side || r.err) problems.push(what + ' ' + JSON.stringify(r));
  };
  await check('initial');
  const clickAll = async (sel, what) => {
    const n = await p.$$eval(sel, bs => bs.length);
    for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await check(what + ' ' + i); }
    return n;
  };
  const counts = {};
  // animation: every step via the range, buttons, segments
  const amax = await p.$eval('#tm-as', s => +s.max);
  for (let v = 0; v <= amax; v++) { await p.evaluate(v => { const s = document.getElementById('tm-as'); s.value = v; s.dispatchEvent(new Event('input')) }, v); await check('anim ' + v) }
  counts.animSteps = amax + 1;
  counts.animBtns = await clickAll('#tm-actl button', 'anim button');
  counts.animBtns += await clickAll('#tm-aseg button', 'anim seg');
  counts.slots = await clickAll('#tm-aslots [data-tm-tool]', 'slot');
  counts.lay = await clickAll('#tm-flay button', 'layer');
  await p.evaluate(() => document.querySelector('#tm-flay button').click());
  counts.status = await clickAll('#tm-fstat button', 'status');
  await p.evaluate(() => document.querySelector('#tm-fstat button').click());
  counts.th = await clickAll('#tm-ttab th[data-k]', 'sort');
  counts.rows = await clickAll('#tm-ttab tr[data-k]', 'row');
  for (const q of ['serving', 'kernel', 'zzzz', '']) { await p.evaluate(q => { const e = document.getElementById('tm-q'); e.value = q; e.dispatchEvent(new Event('input')) }, q); await check('search ' + q) }
  const nj = await p.$eval('#tm-pjob', s => s.options.length), nh = await p.$eval('#tm-phw', s => s.options.length);
  for (let i = 0; i < nj; i++) for (let j = 0; j < nh; j++) {
    await p.evaluate((i, j) => { const a = document.getElementById('tm-pjob'), b = document.getElementById('tm-phw'); a.selectedIndex = i; b.selectedIndex = j; a.dispatchEvent(new Event('change')); b.dispatchEvent(new Event('change')) }, i, j);
    await check('pick ' + i + ',' + j);
  }
  counts.picks = nj * nh;
  counts.chips = await clickAll('#tm-pout [data-tm-tool]', 'chip');
  counts.nodes = await p.$$eval('#tm-lplot g[data-c]', g => g.length);
  for (let i = 0; i < counts.nodes; i++) { await p.evaluate(i => document.querySelectorAll('#tm-lplot g[data-c]')[i].dispatchEvent(new MouseEvent('click', { bubbles: true })), i); await check('node ' + i) }
  counts.irows = await clickAll('#tm-itab tr[data-k]', 'import row');
  await p.evaluate(() => document.querySelectorAll('#t-map details').forEach(d => d.open = true));
  counts.links = await p.$$eval('#t-map a[data-tab]', a => a.length);
  await check('final');
  await p.evaluate(() => { const s = document.getElementById('tm-as'); s.value = 0; s.dispatchEvent(new Event('input')); window.scrollTo(0, 0) });
  await sleep(300);
  await p.screenshot({ path: path.join(outdir, `tm-${scheme}-${width}.png`), fullPage: true });
  for (const id of await p.$$eval('#t-map section', ss => ss.map(x => x.id))) {
    const el = await p.$('#' + id); await el.screenshot({ path: path.join(outdir, `tm-${scheme}-${width}-${id}.png`) });
  }
  console.log(scheme, width, JSON.stringify(counts), 'errors', errs.slice(0, 5), 'net', net.slice(0, 3), 'problems', problems.slice(0, 8), problems.length);
  if (errs.length || problems.length || net.length) bad = 1;
  await p.close();
}
await b.close();
process.exit(bad);
