// Exercise every control of the Architecture map tab at 390 px dark and 920 px light.
// usage (repo root): node technical_knowledge_base/models_and_training/topic_llm_architecture/src/map/check_controls.mjs <index.html> [shot dir]
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page0 = path.resolve(process.argv[2]); const shots = process.argv[3]; if (shots) fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  for (const [scheme, width, rm] of [['dark', 390, 'no-preference'], ['light', 920, 'reduce']]) {
    const p = await b.newPage(); const errs = [];
    p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push('console ' + m.text()));
    await p.setViewport({ width, height: 900 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm }]);
    await p.goto('file://' + page0); await p.click('button[data-t=t-map]'); await sleep(300);
    const check = async (what) => {
      const r = await p.evaluate(() => ({ t: /\bNaN\b|\bundefined\b|\bInfinity\b|\bnull\b/.test(document.getElementById('t-map').innerText),
        side: document.documentElement.scrollWidth > innerWidth, box: document.getElementById('jsErr').hidden ? '' : document.getElementById('jsErr').textContent }));
      if (r.t || r.side || r.box) errs.push(`${what}: ${r.t ? 'NaN/undefined/null text ' : ''}${r.side ? 'sideways ' : ''}${r.box}`);
    };
    const clickAll = async sel => { const n = await p.$$eval(sel, e => e.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].dispatchEvent(new MouseEvent("click",{bubbles:true})), sel, i); await sleep(20); } return n; };
    // timeline: colour modes, every dot, flags, sweep controls
    await clickAll('#am-tl-col button'); await check('timeline colour');
    const nd = await clickAll('#am-tl .am-pt'); await check('timeline dots ' + nd);
    await clickAll('#am-tl-flags button'); await check('flags');
    await p.evaluate(() => { const s = document.getElementById('am-tl-ctl-s'); for (const v of [0, 10, 20, +s.max]) { s.value = v; s.dispatchEvent(new Event('input')) } });
    await clickAll('#am-tl-ctl button'); await clickAll('#am-tl-ctl button'); await check('sweep');
    await p.evaluate(() => { const s = document.getElementById('am-tl-ctl-s'); s.value = s.max; s.dispatchEvent(new Event('input')) });
    if (shots) { const el = await p.$('#am-tl-card'); await el.screenshot({ path: `${shots}/tl-${scheme}-${width}.png` }); }
    // eras: every target, every step
    const nt = await p.$$eval('#am-er-tg button', e => e.length);
    for (let t = 0; t < nt; t++) {
      await p.evaluate(t => document.querySelectorAll('#am-er-tg button')[t].click(), t);
      const n = await p.$eval('#am-er-ctl-s', s => +s.max + 1);
      for (let i = 0; i < n; i++) { await p.evaluate(i => { const s = document.getElementById('am-er-ctl-s'); s.value = i; s.dispatchEvent(new Event('input')) }, i); await check(`eras t${t} s${i}`);
        if (shots && (i === 0 || i === n - 1)) { const el = await p.$('#am-er-card'); await el.screenshot({ path: `${shots}/er-${t}-${i}-${scheme}-${width}.png` }); } }
      // svg text past the svg box
      const over = await p.evaluate(() => { const sv = document.querySelector('#am-er-svg svg'); const W = sv.getBoundingClientRect().right + 0.5; return [...sv.querySelectorAll('text')].filter(t => t.getBoundingClientRect().right > W).map(t => t.textContent) });
      if (over.length) errs.push(`eras t${t} text past svg: ${over.join(' | ')}`);
    }
    await clickAll('#am-er-jump button'); await clickAll('#am-er-ctl button'); await check('eras controls');
    // table: chips, search, sort every column, every row
    for (const id of ['am-f-att', 'am-f-ffn', 'am-f-lic']) { await clickAll(`#${id} button`); await clickAll(`#${id} button`); await check(id); }
    await p.type('#am-f-q', 'qk-norm'); await check('search'); const nq = await p.$eval('#am-f-n', e => e.textContent);
    await p.evaluate(() => { const q = document.getElementById('am-f-q'); q.value = ''; q.dispatchEvent(new Event('input')) });
    const nh = await p.$$eval('#am-tw th[data-k]', e => e.length);
    for (let i = 0; i < nh; i++) { for (let k = 0; k < 2; k++) await p.evaluate(i => document.querySelectorAll('#am-tw th[data-k]')[i].click(), i); }
    await check('sort'); const nr = await clickAll('#am-tw tr[data-id]'); await check('rows ' + nr);
    if (shots) { const el = await p.$('#am-s-table'); await el.screenshot({ path: `${shots}/table-${scheme}-${width}.png` }); }
    // picker and drills
    const np = await p.$$eval('#am-pk button', e => e.length);
    for (let i = 0; i < np; i++) { await p.evaluate(i => document.querySelectorAll('#am-pk button')[i].click(), i); await check('pick ' + i);
      const li = await p.$$eval('#am-pk-out li', e => e.length); if (!li) errs.push('pick ' + i + ' empty list'); }
    await clickAll('#am-pk-out a[data-am]'); await check('pick links');
    if (shots) { const el = await p.$('#am-s-pick'); await el.screenshot({ path: `${shots}/pick-${scheme}-${width}.png` }); }
    await clickAll('#am-drills button'); await check('drills');
    await p.evaluate(() => document.querySelectorAll('#t-map details').forEach(d => d.open = true)); await check('details');
    if (shots) { const el = await p.$('#am-s-read'); await el.screenshot({ path: `${shots}/read-${scheme}-${width}.png` }); }
    console.log(scheme, width, 'dots', nd, 'targets', nt, 'rows', nr, 'search', nq, errs.length ? errs : 'clean'); bad += errs.length;
    await p.close();
  }
} finally { await b.close(); }
process.exit(bad ? 1 : 0);
