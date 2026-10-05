// Exercise every control of the Notation decoder tab at 390 px dark and 920 px light.
// usage (from src/notation/): node check_page.mjs [shotdir]
// Prints errors, unmatched symbols, NaN/undefined, sideways scroll; writes page_numbers.json for recompute.py.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page_url = 'file://' + path.join(here, '../../index.html');
const shots = process.argv[2] || path.join(here, '.shots');
fs.mkdirSync(shots, { recursive: true });

const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let problems = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await p.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(page_url, { waitUntil: 'load' });
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await p.evaluate(() => document.querySelector('#tabs button[data-t="t-notation"]').click());
  const res = await p.evaluate(async () => {
    const out = { bad: [], wide: [], eqs: {} };
    const tab = document.getElementById('t-notation');
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const chk = (where) => {
      const t = tab.innerText;
      if (/\bNaN\b|undefined|Infinity/.test(t)) out.bad.push(where + ': NaN/undefined in text');
      const de = document.documentElement;
      if (de.scrollWidth > de.clientWidth + 1) out.wide.push(where + ': page ' + de.scrollWidth + ' > ' + de.clientWidth);
    };
    const picks = [...document.querySelectorAll('#nd-pick button')];
    for (const b of picks) {
      b.click(); await sleep(20);
      const id = b.dataset.eq;
      const art = document.getElementById('nd-eq-' + id);
      if (art.hidden) out.bad.push(id + ' did not show');
      const info = { syms: 0, tapped: 0, nodes: art.querySelectorAll('.nd-m [data-sym]').length };
      for (const c of art.querySelectorAll('.nd-chips button')) {
        c.click(); info.syms++;
        const d = art.querySelector('.nd-sdi[data-sym="' + c.dataset.sym + '"]');
        if (!d || d.hidden) out.bad.push(id + ':' + c.dataset.sym + ' detail not shown');
        const lit = art.querySelectorAll('.nd-m .nd-on').length;
        if (!lit) out.bad.push(id + ':' + c.dataset.sym + ' nothing lit in equation');
      }
      // tap the rendered symbols themselves
      for (const el of art.querySelectorAll('.nd-m [data-sym]')) {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const d = art.querySelector('.nd-sdi[data-sym="' + el.getAttribute('data-sym') + '"]');
        if (d && !d.hidden) info.tapped++;
      }
      // wide formulas must scroll inside their own box
      art.querySelectorAll('math[display="block"]').forEach((m, k) => {
        const box = m.closest('.nd-m,.nd-sm,.ex');
        if (box && box.getBoundingClientRect().right > document.documentElement.clientWidth + 1) out.wide.push(id + ' formula box ' + k + ' overflows');
      });
      out.eqs[id] = info;
      chk(id);
    }
    // prev / next
    document.getElementById('nd-next').click(); document.getElementById('nd-prev').click();
    // animation: both modes, every step
    const anim = {};
    document.querySelector('#nd-pick button[data-eq="attn"]').click();
    for (const m of ['s', 'u']) {
      document.querySelector('#nd-an-mode button[data-m="' + m + '"]').click();
      const sc = document.getElementById('nd-an-ctl-s');
      sc.value = 0; sc.dispatchEvent(new Event('input'));
      const caps = [];
      for (let i = 0; i < 13; i++) {
        caps.push(document.getElementById('nd-an-cap').textContent);
        chk('anim ' + m + ' step ' + i);
        document.getElementById('nd-an-ctl-f').click();
      }
      document.getElementById('nd-an-ctl-b').click();
      anim[m] = { caps, final: document.getElementById('nd-an-stage').innerText };
    }
    document.getElementById('nd-an-ctl-p').click(); await sleep(50); document.getElementById('nd-an-ctl-p').click();
    document.getElementById('nd-an-ctl-v').value = '2'; document.getElementById('nd-an-ctl-v').dispatchEvent(new Event('change'));
    out.anim = anim; out.att = window.ND_ATT; out.cmp = document.getElementById('nd-an-cmp').textContent;
    // conventions filter and "seen in"
    const f = document.getElementById('nd-filter');
    for (const q of ['log', 'hat', 'zzz', '']) { f.value = q; f.dispatchEvent(new Event('input')); out['filter_' + (q || 'none')] = [...document.querySelectorAll('#nd-ref > div')].filter(d => !d.hidden).length; }
    for (const b of document.querySelectorAll('#nd-ref button[data-go]')) { b.click(); if (document.getElementById('nd-eq-' + b.dataset.go).hidden) out.bad.push('seen-in ' + b.dataset.go + ' failed'); }
    chk('after all');
    out.unmatched = window.ND_UNMATCHED;
    out.jsErr = !document.getElementById('jsErr').hidden ? document.getElementById('jsErr').textContent : '';
    return out;
  });
  // screenshots: a few cards and the animation
  for (const id of ['attn', 'adam', 'grpo', 'kl3']) {
    await p.evaluate(id => document.querySelector('#nd-pick button[data-eq="' + id + '"]').click(), id);
    const el = await p.$('#nd-eq-' + id);
    await el.screenshot({ path: path.join(shots, `${id}_${w}_${scheme}.png`) });
  }
  const conv = await p.$('#nd-conv'); await conv.screenshot({ path: path.join(shots, `conv_${w}_${scheme}.png`) });
  console.log(`== ${w} ${scheme}`);
  console.log('errors', errs.length, errs.slice(0, 5));
  console.log('jsErr', JSON.stringify(res.jsErr));
  console.log('bad', res.bad.length, res.bad.slice(0, 30));
  console.log('wide', res.wide.length, res.wide.slice(0, 10));
  console.log('unmatched', res.unmatched);
  console.log('per equation (chips, MathML nodes mapped, taps that opened a detail):', Object.entries(res.eqs).map(([k, v]) => `${k} ${v.syms}/${v.nodes}/${v.tapped}`).join('; '));
  console.log('filters', res.filter_log, res.filter_hat, res.filter_zzz, res.filter_none);
  console.log('cmp', res.cmp);
  problems += errs.length + res.bad.length + res.wide.length + res.unmatched.length + (res.jsErr ? 1 : 0);
  if (w === 390) fs.writeFileSync(path.join(here, 'page_numbers.json'), JSON.stringify({ att: res.att, anim: res.anim }, null, 1));
  await p.close();
}
await browser.close();
console.log('problems', problems);
