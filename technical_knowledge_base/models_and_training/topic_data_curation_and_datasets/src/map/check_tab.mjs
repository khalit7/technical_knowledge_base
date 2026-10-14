// Click every control of the Tool map (t-map) at 390 px dark and 920 px light; fail on script errors, on "NaN" or
// "undefined" in the tab's text, and on sideways scroll. Screenshots go to the folder given.
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
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  await p.click('button[data-t=t-map]');
  await sleep(400);
  const problems = [];
  const check = async (what) => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-map').innerText;
      const side = document.documentElement.scrollWidth > innerWidth;
      return { nan: /\bNaN\b/.test(t), und: /\bundefined\b/.test(t), side, err: (d => d && !d.hidden ? d.textContent : '')(document.getElementById('jsErr')) };
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
  counts.stages = await clickAll('#tm-stack button', 'stage');
  await p.evaluate(() => document.querySelector('#tm-stack button.on') && document.querySelector('#tm-stack button.on').click());
  counts.status = await clickAll('#tm-fstat button', 'status');
  await p.evaluate(() => document.querySelector('#tm-fstat button').click());
  counts.cards = await clickAll('#tm-cards button', 'card');
  await p.evaluate(() => { const q = document.getElementById('tm-q'); q.value = 'dedup'; q.dispatchEvent(new Event('input')) }); await check('search');
  await p.evaluate(() => { const q = document.getElementById('tm-q'); q.value = ''; q.dispatchEvent(new Event('input')) });
  await p.evaluate(() => document.querySelectorAll('#t-map details').forEach(d => d.open = true));
  counts.th = await clickAll('#t-map table th[data-k]', 'sort');
  counts.rows = await clickAll('#tm-ttab tr[data-k]', 'tool row');
  counts.crows = await clickAll('#tm-ctab tr[data-k]', 'corpus row');
  // picker: every combination
  const opts = await p.$$eval('#tm-s-pick select', s => s.map(x => [x.id, x.options.length]));
  const combos = [[]];
  for (const [id, n] of opts) { const nx = []; for (const c of combos) for (let o = 0; o < n; o++) nx.push(c.concat([[id, o]])); combos.splice(0, combos.length, ...nx) }
  for (const c of combos) {
    await p.evaluate(c => { for (const [id, o] of c) { const s = document.getElementById(id); s.selectedIndex = o; s.dispatchEvent(new Event('change')) } }, c);
    await check('picker ' + c.map(x => x[1]).join(''));
  }
  counts.picks = combos.length;
  counts.pickLinks = await clickAll('#tm-pout a[data-tm-tool]', 'pick link');
  counts.segs = 0;
  for (const seg of ['#tm-lmode', '#tm-tmode', '#tm-pmode']) {
    const n = await p.$$eval(seg + ' button', bs => bs.length).catch(() => 0);
    for (let i = 0; i < n; i++) {
      await p.evaluate((s, i) => document.querySelectorAll(s + ' button')[i].click(), seg, i);
      counts.segs++;
      const ranges = await p.$$eval('#t-map input[type=range]', s => s.map(x => [x.id, +x.min, +x.max]));
      for (const [id, mn, mx] of ranges) for (let v = mn; v <= mx; v++) {
        await p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input')) }, id, v);
        await check('range ' + seg + i + ' ' + id + ' ' + v);
      }
    }
  }
  counts.anim = await clickAll('#t-map .tm-ctl button', 'anim button');
  counts.nodes = await p.$$eval('#tm-lplot g[data-c]', g => g.length);
  for (let i = 0; i < counts.nodes; i++) { await p.evaluate(i => document.querySelectorAll('#tm-lplot g[data-c]')[i].dispatchEvent(new MouseEvent('click', { bubbles: true })), i); await check('node ' + i) }
  counts.corpLinks = await clickAll('#tm-ldet a[data-tm-corp]', 'corp link');
  counts.lic = await clickAll('#tm-licf button', 'licence filter');
  await p.evaluate(() => document.querySelector('#tm-licf button').click());
  // offline: no network requests
  await check('final');
  await sleep(800);
  await p.screenshot({ path: path.join(outdir, `tm-${scheme}-${width}.png`), fullPage: true });
  for (const id of await p.$$eval('#t-map section', ss => ss.map(x => x.id))) {
    const el = await p.$('#' + id); await el.screenshot({ path: path.join(outdir, `tm-${scheme}-${width}-${id}.png`) });
  }
  console.log(scheme, width, JSON.stringify(counts), 'errors', errs.slice(0, 5), 'problems', problems.slice(0, 8), problems.length);
  if (errs.length || problems.length) bad = 1;
  await p.close();
}
await b.close();
process.exit(bad);
