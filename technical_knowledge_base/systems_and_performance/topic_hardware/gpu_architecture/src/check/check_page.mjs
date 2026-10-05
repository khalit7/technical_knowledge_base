// Whole-page check: every tab, every control clicked, at 390 px dark and 920 px light; page errors, NaN, undefined,
// sideways scroll; animation utilisation against window.GA.hide; screenshots per tab and per Reading section.
// usage: node <page>/src/check/check_page.mjs [shots dir]   (puppeteer from html_utils/node_modules)
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
  for (const tab of ['t-read', 't-floor', 't-lab', 't-more']) {
    await p.evaluate(t => document.querySelector('#tabs button[data-t="' + t + '"]').click(), tab);
    await sleep(250);
    const n = await p.evaluate(async (t) => {
      const root = document.getElementById(t); let c = 0;
      for (const s of root.querySelectorAll('section,.card,.fl-card,.lb-card')) { s.scrollIntoView(); await new Promise(r => setTimeout(r, 40)); }
      for (const b of [...root.querySelectorAll('button')]) { if (b.offsetParent === null) continue; b.scrollIntoView({ block: 'center' }); b.click(); c++; await new Promise(r => setTimeout(r, 20)); }
      for (const r of root.querySelectorAll('input[type=range]')) { for (const v of [r.min, r.max, Math.round((+r.min + +r.max) / 2)]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); c++; } }
      for (const s of root.querySelectorAll('select')) { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); c++; await new Promise(r => setTimeout(r, 20)); } }
      for (const x of root.querySelectorAll('input[type=checkbox]')) { x.click(); x.click(); c += 2; }
      for (const d of root.querySelectorAll('details')) { d.open = true; }
      return c;
    }, tab);
    const txt = await p.evaluate(t => document.getElementById(t).innerText, tab);
    const html = await p.evaluate(t => document.getElementById(t).innerHTML, tab);
    const nan = /\bNaN\b|\bundefined\b|Infinity/.test(txt) || /NaN|undefined/.test(html.replace(/[^>]*</g, '<'));
    const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (nan || sw > 1) { bad++; console.log(scheme, w, tab, 'NaN/undefined:', nan, 'sideways:', sw); }
    console.log(scheme, w, tab, 'controls', n, 'ok');
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: path.join(shots, `${scheme}_${w}_${tab}.png`), fullPage: tab !== 't-read' });
  }
  // reading sections one by one, and the animations' end states
  await p.evaluate(() => document.querySelector('#tabs button[data-t="t-read"]').click());
  const checks = await p.evaluate(async () => {
    const out = [];
    const seg = (id, m) => document.querySelector('#' + id + ' button[data-m="' + m + '"]').click();
    for (const m of ['0', '1', '2']) {
      seg('ga-hideSeg', m); const s = document.getElementById('ga-hideCtl-s'); s.value = s.max; s.dispatchEvent(new Event('input', { bubbles: true }));
      const t = document.getElementById('ga-hideOut').innerText; const v = parseFloat(t.split('Steady state')[1].match(/([\d.]+)%/)[1]);
      out.push(['hide ' + m, v, Math.round(window.GA.hide[+m].util_steady * 1000) / 10]);
    }
    for (const m of ['amp', 'hop', 'bw']) {
      seg('ga-tcSeg', m); const s = document.getElementById('ga-tcCtl-s'); s.value = 4; s.dispatchEvent(new Event('input', { bubbles: true }));
      const t = document.getElementById('ga-tcOut').innerText; const v = parseInt(t.split('\n').find(l => /^[\d,]+$/.test(l.trim())).replace(/,/g, ''));
      out.push(['tc ' + m, v, { amp: window.GA.tile.ampere_instr, hop: window.GA.tile.hopper_instr, bw: window.GA.tile.blackwell_instr }[m]]);
    }
    return out;
  });
  for (const c of checks) { const ok = Math.abs(c[1] - c[2]) < 0.051; if (!ok) bad++; console.log(scheme, 'check', c[0], 'page', c[1], 'reference', c[2], ok ? 'ok' : 'MISMATCH'); }
  const secs = await p.evaluate(() => [...document.querySelectorAll('#t-read section')].map(s => s.id));
  for (const id of secs) {
    const el = await p.$('#' + id);
    await el.scrollIntoView(); await sleep(150);
    await el.screenshot({ path: path.join(shots, `${scheme}_${w}_${id}.png`) });
  }
  if (errs.length) { bad++; console.log(scheme, 'errors:', errs.slice(0, 5)); }
  const jsErr = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : ''; });
  if (jsErr) { bad++; console.log('jsErr:', jsErr); }
  await p.close();
}
await browser.close();
console.log(bad ? `FAIL ${bad}` : 'ALL OK');
process.exit(bad ? 1 : 0);
