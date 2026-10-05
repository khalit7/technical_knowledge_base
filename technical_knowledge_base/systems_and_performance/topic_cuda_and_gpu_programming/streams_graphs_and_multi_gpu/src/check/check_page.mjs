// Whole-page check: every tab and control at 390 px dark and 920 px light: page errors, NaN, undefined,
// sideways scroll; the page's step model (SGM.step) against recompute.py's (window.SG.step); the launch
// model against NVIDIA's figures; animation end states; screenshots.
// usage (from the repo root): node <page>/src/check/check_page.mjs [shots dir]
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../../..');
const require = createRequire(path.join(repo, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const pageFile = path.resolve(here, '../../index.html');
const shots = process.argv[2] || path.resolve(here, '../../.shots/own');
fs.mkdirSync(shots, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let bad = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.setViewport({ width: w, height: 900 });
  await p.goto('file://' + pageFile);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  // models against the Python data
  const m = await p.evaluate(() => {
    const out = [];
    const c = SGM.cfgFromData();
    for (const [k, ov] of [['serial', false], ['overlap', true]]) {
      const js = SGM.step(c, ov, 0), py = SG.step[k];
      for (const f of ['fwd', 'bwd', 'opt', 'copy', 'comm', 'total', 'exposed']) if (Math.abs(js[f] - py[f]) > 1e-3) out.push(k + '.' + f + ' js ' + js[f] + ' py ' + py[f]);
      if (js.events.length !== py.events.length) out.push(k + ' events ' + js.events.length + ' vs ' + py.events.length);
      js.events.forEach((e, i) => { const q = py.events[i]; if (e[0] !== q[0] || Math.abs(e[1] - q[1]) > 1e-3 || Math.abs(e[2] - q[2]) > 1e-3) out.push(k + ' event ' + i); });
    }
    const B = SG.blog;
    for (const [mode, key] of [['sync', 'sync_each'], ['stream', 'stream'], ['graph', 'graph']]) { const per = SGL.steady(mode, B); if (Math.abs(per - B[key]) > 1e-9) out.push('launch ' + mode + ' ' + per); }
    if (Math.abs(SGL.model('sync', B).total / B.n - B.sync_each) > 1e-9) out.push('sync step');
    return out;
  });
  if (m.length) { console.log('MODEL', scheme, m); bad += m.length; }
  for (const tab of ['t-read', 't-step', 't-more']) {
    await p.evaluate(t => document.querySelector('#tabs button[data-t="' + t + '"]').click(), tab);
    await sleep(250);
    const n = await p.evaluate(async (t) => {
      const root = document.getElementById(t); let c = 0;
      for (const s of root.querySelectorAll('section,.card')) { s.scrollIntoView(); await new Promise(r => setTimeout(r, 40)); }
      for (const b of [...root.querySelectorAll('button')]) { if (b.offsetParent === null) continue; b.scrollIntoView({ block: 'center' }); b.click(); c++; await new Promise(r => setTimeout(r, 20)); }
      for (const r of root.querySelectorAll('input[type=range]')) { for (const v of [r.min, r.max, Math.round((+r.min + +r.max) / 2)]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); c++; } }
      for (const s of root.querySelectorAll('select')) { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); c++; await new Promise(r => setTimeout(r, 20)); } }
      for (const x of root.querySelectorAll('input[type=checkbox]')) { x.click(); c++; x.click(); c++; }
      for (const d of root.querySelectorAll('details')) { d.open = true; }
      return c;
    }, tab);
    await sleep(300);
    const r = await p.evaluate(t => {
      const root = document.getElementById(t); const txt = root.innerText;
      const mm = txt.match(/.{0,60}NaN.{0,30}/); return { where: mm ? mm[0] : '', nan: /\bNaN\b/.test(txt), undef: /\bundefined\b/.test(txt), inf: /Infinity/.test(txt), side: document.documentElement.scrollWidth > innerWidth + 1, err: !document.getElementById('jsErr').hidden };
    }, tab);
    const fails = Object.entries(r).filter(([k, v]) => v && k !== 'where').map(([k]) => k);
    if (fails.length || errs.length) { console.log('FAIL', tab, scheme, w, fails, r.where, errs.slice(0, 3)); bad++; }
    else console.log('ok', tab, scheme, w, n, 'controls');
    await p.screenshot({ path: path.join(shots, `${tab}_${scheme}_${w}.png`), fullPage: true });
  }
  // animation end states: step to the end of each and read the counters
  await p.evaluate(() => document.querySelector('#tabs button[data-t="t-read"]').click());
  const ends = await p.evaluate(async () => {
    const out = {};
    for (const [seg, ctl, cnt] of [['sg-st-seg', 'sg-st-ctl', 'sg-st-cnt'], ['sg-ln-seg', 'sg-ln-ctl', 'sg-ln-cnt']]) {
      for (const b of document.querySelectorAll('#' + seg + ' button')) {
        b.click(); const sc = document.getElementById(ctl + '-s'); sc.value = sc.max; sc.dispatchEvent(new Event('input'));
        out[seg + ':' + b.dataset.m] = document.getElementById(cnt).innerText.replace(/\s+/g, ' ');
      }
    }
    return out;
  });
  for (const [k, v] of Object.entries(ends)) console.log('  end', k, v.slice(0, 160));
  await p.close();
}
await browser.close();
console.log(bad ? `${bad} problems` : 'all checks passed');
process.exit(bad ? 1 : 0);
