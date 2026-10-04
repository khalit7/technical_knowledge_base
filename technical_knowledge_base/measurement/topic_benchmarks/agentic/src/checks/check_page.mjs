// Exercise every control at 390 px dark and 920 px light; fail on errors, NaN, undefined, null text or sideways scroll.
// Also dumps the page's own computations (pass^k, METR fits, regex verdicts, doubling times) to checks/js_out.json for recompute.py.
// usage (from src/): node checks/check_page.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = 'file://' + path.resolve(here, '../../index.html');
const b = await puppeteer.launch({ headless: 'shell' });
let problems = [], actions = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(page); await wait(300);
  const bad = async (where) => {
    const r = await p.evaluate(() => {
      const t = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' ');
      const m = t.match(/NaN|undefined|\bnull\b(?! agent)(?! and random)|Infinity/); return { m: m ? t.slice(Math.max(0, m.index - 60), m.index + 40) : '', sw: document.documentElement.scrollWidth > innerWidth, box: document.getElementById('jsErr').hidden ? '' : document.getElementById('jsErr').textContent };
    });
    if (r.m) problems.push(`${scheme}${width} ${where}: bad text "${r.m}"`);
    if (r.sw) problems.push(`${scheme}${width} ${where}: sideways scroll`);
    if (r.box) problems.push(`${scheme}${width} ${where}: error box ${r.box}`);
  };
  const clickAll = async (sel, where) => { const n = await p.$$eval(sel, e => e.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].dispatchEvent(new MouseEvent("click",{bubbles:true})), sel, i); actions++; await wait(30); await bad(where + ' ' + sel + '#' + i) } };
  const setSel = async (sel, where) => { const vals = await p.$$eval(sel + ' option', o => o.map(x => x.value)); for (const v of vals) { await p.evaluate((s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('change')); e.dispatchEvent(new Event('input')) }, sel, v); actions++; await wait(25); await bad(where + ' ' + sel + '=' + v) } };
  const setRange = async (sel, where) => { const [lo, hi] = await p.$eval(sel, e => [+e.min, +e.max]); for (let v = lo; v <= hi; v++) { await p.evaluate((s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input')) }, sel, v); actions++; await wait(20); await bad(where + ' ' + sel + '=' + v) } };
  // Reading
  await bad('read load');
  for (const m of [0, 1, 2]) { await p.evaluate(m => document.querySelector(`#an1-mode button[data-m="${m}"]`).click(), m); for (let i = 0; i < 7; i++) { await p.click('#an1-ctl-f'); actions++ } await bad('an1 mode ' + m); for (let i = 0; i < 7; i++) { await p.click('#an1-ctl-b'); actions++ } }
  await setRange('#an1-ctl-s', 'an1 scrub');
  for (const m of ['hat', 'at']) { await p.evaluate(m => document.querySelector(`#an2-mode button[data-m="${m}"]`).click(), m); await setSel('#an2-set', 'an2 ' + m); await setRange('#an2-ctl-s', 'an2 scrub ' + m) }
  await p.click('#an2-ctl-p'); await wait(500); await p.click('#an2-ctl-p'); actions += 2;
  await p.select('#an2-ctl-v', '2'); actions++;
  await clickAll('#tbb-y button', 'tbb'); await clickAll('#tbb-fig circle[data-i]', 'tbb points');
  await clickAll('#tbl-fig g[data-i]', 'tbl');
  await clickAll('.mist summary', 'mistakes'); await clickAll('#rd-check input', 'checklist');
  await clickAll('#rd-nav a', 'nav');
  // pass^k tab
  await p.click('button[data-t="t-pk"]'); await wait(200); await bad('pk load');
  const doms = await p.$$eval('#pk-dom option', o => o.map(x => x.value));
  for (const d of doms) { await p.evaluate(d => { const e = document.getElementById('pk-dom'); e.value = d; e.dispatchEvent(new Event('change')) }, d); actions++; await setRange('#pk-k', 'pk ' + d); await setSel('#pk-a', 'pk a ' + d); await setSel('#pk-b', 'pk b ' + d) }
  // horizon tab
  await p.click('button[data-t="t-th"]'); await wait(200); await bad('th load');
  await setSel('#th-m', 'th'); await clickAll('#th-bins', 'th bins'); await clickAll('#th-bins', 'th bins'); await setRange('#th-y', 'th year'); await clickAll('#th-ex', 'th ex'); await setRange('#th-y', 'th year ex'); await clickAll('#th-ex', 'th ex');
  // task tab
  await p.click('button[data-t="t-task"]'); await wait(200); await bad('task load');
  await clickAll('#tk-presets button', 'presets');
  await p.evaluate(() => { const t = document.getElementById('tk-rx'); t.disabled = false; t.value = '(?P<d>\\d{4}-\\d{2}-\\d{2})'; t.dispatchEvent(new Event('input')) }); await p.click('#tk-run'); actions++; await bad('task custom named group');
  await p.evaluate(() => { const t = document.getElementById('tk-rx'); t.value = '(['; t.dispatchEvent(new Event('input')) }); await p.click('#tk-run'); actions++; await bad('task invalid regex');
  await setSel('#tk-ag', 'task agent'); await setSel('#tk-lay', 'task layout');
  // further reading
  await p.click('button[data-t="t-more"]'); await wait(150); await bad('more');
  const links = await p.$$eval('a[href^="http"]', a => a.filter(x => x.target !== '_blank' || x.rel !== 'noopener noreferrer').map(x => x.href));
  if (links.length) problems.push('links without target/rel: ' + links.slice(0, 5).join(' '));
  if (errs.length) problems.push(`${scheme}${width} errors: ${errs.join(' | ')}`);
  if (scheme === 'light') {
    const out = await p.evaluate(() => ({
      tau: AG.tau.map(s => ({ id: s.id, ok: s.ok, hat: [1, 2, 3, 4].map(k => PK.metric(s, k, 'hat')), at: [1, 2, 3, 4].map(k => PK.metric(s, k, 'at')), hist: PK.hist(s) })),
      metr: AG.metr.agents.map(a => { const f = TH.fit(a); return { n: a.n, key: a.key, p50: f.p50, p80: f.p80 } }),
      trend: { from2023: TH.trend('2023-01-01', true).dbl, all: TH.trend('2019-01-01', true).dbl },
      regex: Object.fromEntries(Object.entries(TK.PRESETS).map(([k, v]) => [k, TK.run(v)])),
      survey: AG.survey
    }));
    fs.writeFileSync(path.resolve(here, 'js_out.json'), JSON.stringify(out));
  }
  await p.close();
}
await b.close();
console.log(problems.length ? problems.join('\n') : 'no problems', '| actions', actions);
process.exit(problems.length ? 1 : 0);
