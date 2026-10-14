// Click every control of the Pipeline lab (t-pipe) of Topic: data-curation-and-datasets (adapted from the RAG topic's check) at 390 px dark and 920 px light; fail on script errors, on
// "NaN" or "undefined" in the tab's text, and on sideways scroll. Screenshots go to the folder given.
// usage: node src/pipe/check_tab.mjs <page index.html> <screenshot folder>
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, outdir] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  await p.click('button[data-t=t-pipe]');
  await new Promise(r => setTimeout(r, 400));
  const problems = [];
  const check = async (what) => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-pipe').innerText;
      return { nan: /\bNaN\b/.test(t), und: /\bundefined\b/.test(t), side: document.documentElement.scrollWidth > innerWidth,
        err: (d => d && !d.hidden ? d.textContent : '')(document.getElementById('jsErr')) };
    });
    if (r.nan || r.und || r.side || r.err) problems.push(what + ' ' + JSON.stringify(r));
  };
  await check('initial');
  // every segmented button, every select option, every range value, every predict option, every animation control
  const n = await p.$$eval('#t-pipe .seg button', bs => bs.length);
  for (let i = 0; i < n; i++) {
    await p.evaluate(i => document.querySelectorAll('#t-pipe .seg button')[i].click(), i);
    await new Promise(r => setTimeout(r, 30));
    await check('seg ' + i);
  }
  const sels = await p.$$eval('#t-pipe select', s => s.map(x => x.id || ''));
  for (const id of sels) {
    const opts = await p.$eval('#' + id, s => s.options.length);
    for (let o = 0; o < opts; o++) {
      await p.evaluate((id, o) => { const s = document.getElementById(id); s.selectedIndex = o; s.dispatchEvent(new Event('change')) }, id, o);
      await check('select ' + id + ' ' + o);
    }
  }
  const ranges = await p.$$eval('#t-pipe input[type=range]', s => s.map(x => [x.id, +x.min, +x.max]));
  for (const [id, mn, mx] of ranges) {
    for (let v = mn; v <= mx; v++) {
      await p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input')) }, id, v);
      await check('range ' + id + ' ' + v);
    }
  }
  const np = await p.$$eval('#t-pipe .pip-opt', bs => bs.length);
  for (let i = 0; i < np; i++) { await p.evaluate(i => document.querySelectorAll('#t-pipe .pip-opt')[i].click(), i); }
  await p.evaluate(() => document.querySelectorAll('#t-pipe details').forEach(d => d.open = true));
  await check('opened');
  await new Promise(r => setTimeout(r, 900));
  await p.screenshot({ path: path.join(outdir, `pip-${scheme}-${width}.png`), fullPage: true });
  for (const id of await p.$$eval('#t-pipe section', ss => ss.map(x => x.id))) {
    const el = await p.$('#' + id); await el.screenshot({ path: path.join(outdir, `pip-${scheme}-${width}-${id}.png`) });
  }
  console.log(scheme, width, 'errors', errs, 'problems', problems.slice(0, 8), problems.length);
  if (errs.length || problems.length) bad = 1;
  await p.close();
}
await b.close();
process.exit(bad);
