// Whole-page check: every tab and control at 390 px dark and 920 px light (page errors, NaN, undefined, sideways scroll);
// the page's simulator and fabric JavaScript against the Python reference cases in out/expected.json;
// screenshots per tab and per Reading section to ../../.shots/own/.
// usage: node <page>/src/check/check_page.mjs   (puppeteer from html_utils/node_modules)
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../../..');
const require = createRequire(path.join(repo, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const pageFile = path.resolve(here, '../../index.html');
const exp = JSON.parse(fs.readFileSync(path.resolve(here, '../out/expected.json'), 'utf8'));
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
  for (const tab of ['t-read', 't-sim', 't-more']) {
    await p.evaluate(t => document.querySelector('#tabs button[data-t="' + t + '"]').click(), tab);
    await sleep(250);
    const n = await p.evaluate(async (t) => {
      const root = document.getElementById(t); let c = 0;
      for (const s of root.querySelectorAll('section,.card')) { s.scrollIntoView(); await new Promise(r => setTimeout(r, 40)); }
      for (const b of [...root.querySelectorAll('button')]) { if (b.offsetParent === null) continue; b.scrollIntoView({ block: 'center' }); b.click(); c++; await new Promise(r => setTimeout(r, 15)); }
      for (const r of root.querySelectorAll('input[type=range]')) { for (const v of [r.min, r.max, Math.round((+r.min + +r.max) / 2)]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); c++; } }
      for (const s of root.querySelectorAll('select')) { for (const o of [...s.options]) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); c++; await new Promise(r => setTimeout(r, 15)); } s.selectedIndex = 0; s.dispatchEvent(new Event('change', { bubbles: true })); }
      for (const x of root.querySelectorAll('input[type=checkbox]')) { x.click(); x.click(); c += 2; }
      for (const d of root.querySelectorAll('details')) { d.open = true; }
      return c;
    }, tab);
    const txt = await p.evaluate(t => document.getElementById(t).innerText, tab);
    const nan = /\bNaN\b|\bundefined\b|Infinity(?! Fabric)/.test(txt);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (nan || sw > 1) { bad++; console.log('FAIL', scheme, w, tab, 'NaN/undefined:', nan, 'sideways:', sw); }
    console.log(scheme, w, tab, 'controls', n);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: path.join(shots, `${scheme}_${w}_${tab}.png`), fullPage: tab !== 't-read' });
  }
  // Reading cards one by one (topology and mesh in every mode, the RDMA stepper at its last step)
  await p.evaluate(() => document.querySelector('#tabs button[data-t="t-read"]').click());
  await p.evaluate(() => { for (const d of document.querySelectorAll('#t-read details')) d.open = false; });
  const shot = async (id, tag) => { const el = await p.$('#' + id); if (!el) { bad++; console.log('missing', id); return; }
    await el.scrollIntoView(); await sleep(200); await el.screenshot({ path: path.join(shots, `${scheme}_${w}_${id}${tag || ''}.png`) }); };
  for (const id of ['ic-herocard', 'ic-abcard', 'ic-meshcard', 'ic-flcard', 'fab-card', 'ic-arcard', 'ic-cccard', 'ic-mcard', 'ic-pcard']) await shot(id);
  for (const m of ['ft', 'torus', 'df']) { await p.evaluate(m => document.querySelector('#ic-topom button[data-m="' + m + '"]').click(), m); await shot('ic-topocard', '_' + m); }
  await p.evaluate(() => document.querySelector('#ic-meshm button[data-m="mesh"]').click()); await shot('ic-meshcard', '_mesh');
  for (const k of [0, 4]) { await p.evaluate(k => { const r = document.getElementById('ic-rdctl-s'); r.value = k; r.dispatchEvent(new Event('input', { bubbles: true })); }, k); await shot('ic-rdcard', '_' + k); }
  for (const id of ['ic-s3', 'ic-s6']) { const el = await p.$('#' + id + ' figure'); await el.scrollIntoView(); await sleep(300); await el.screenshot({ path: path.join(shots, `${scheme}_${w}_${id}_fig.png`) }); }
  if (errs.length) { bad++; console.log('ERRORS', scheme, errs); }
  if (scheme === 'dark') {
    // JS simulator and fabric model against Python
    const res = await p.evaluate((sc, fc) => {
      let m = 0;
      for (const c of sc) { const r = ICSIM.run(c.coll, c.alg, c.n, c.S, c.a, c.b);
        if (!r.ok || Math.abs(r.time - c.time) > 1e-5 * c.time || r.steps !== c.steps || Math.abs(r.sent - c.sent) > 1e-5 * c.sent) m++; }
      let f = 0;
      for (const c of fc) { const r = ICFAB.loads(c.fab, c.pat, c.srv, 1e9, { over: c.over, pxn: c.pxn });
        if (Math.abs(r.total - c.total) > 1e-5 * Math.max(c.total, 1e-12) || r.worst !== c.worst || Math.abs(r.ports - c.ports) > 1e-4 * c.ports) f++; }
      return [sc.length, m, fc.length, f];
    }, exp.simcases, exp.fabcases);
    console.log('simulator cases', res[0], 'mismatches', res[1], '; fabric cases', res[2], 'mismatches', res[3]);
    if (res[1] || res[3]) bad++;
  }
  await p.close();
}
{ // nothing moves before the reader acts: scroll every animation into view and wait
  const p = await browser.newPage(); await p.setViewport({ width: 920, height: 900 }); await p.goto('file://' + pageFile);
  for (const id of ['ic-arcard', 'ic-rdcard']) { await p.$eval('#' + id, e => e.scrollIntoView()); await sleep(3000); }
  const moved = await p.evaluate(() => ['ic-arctl-s', 'ic-rdctl-s'].map(i => +document.getElementById(i).value));
  if (moved.some(v => v !== 0)) { bad++; console.log('FAIL autoplay', moved); } else console.log('no autoplay: animations wait on step 0');
  await p.close(); }
await browser.close();
console.log(bad ? 'FAIL ' + bad : 'ALL OK');
process.exit(bad ? 1 : 0);
