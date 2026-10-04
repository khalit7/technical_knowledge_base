// Exercise every control at 390 px dark and 920 px light; fail on errors, NaN, undefined, null text or sideways scroll.
// Dumps the page's computations (XSTest rates by grader, grader note, HarmBench ranks, string-match verdicts) to checks/js_out.json for recompute.py.
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
let problems = [], actions = 0, out = {};
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
      const m = t.match(/NaN|undefined|\bnull\b|Infinity/); return { m: m ? t.slice(Math.max(0, m.index - 60), m.index + 40) : '', sw: document.documentElement.scrollWidth > innerWidth, box: document.getElementById('jsErr').hidden ? '' : document.getElementById('jsErr').textContent };
    });
    if (r.m) problems.push(`${scheme}${width} ${where}: bad text "${r.m}"`);
    if (r.sw) problems.push(`${scheme}${width} ${where}: sideways scroll`);
    if (r.box) problems.push(`${scheme}${width} ${where}: error box ${r.box}`);
  };
  const fire = (s, i) => p.evaluate((s, i) => document.querySelectorAll(s)[i].dispatchEvent(new MouseEvent('click', { bubbles: true })), s, i);
  const clickAll = async (sel, where, step = 1) => { const n = await p.$$eval(sel, e => e.length); for (let i = 0; i < n; i += step) { await fire(sel, i); actions++; await wait(15); await bad(where + ' ' + sel + '#' + i) } return n };
  const setSel = async (sel, where, after) => { const vals = await p.$$eval(sel + ' option', o => o.map(x => x.value)); for (const v of vals) { await p.evaluate((s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('change')); e.dispatchEvent(new Event('input')) }, sel, v); actions++; await wait(25); await bad(where + ' ' + sel + '=' + v); if (after) await after(v) } };
  const setRange = async (sel, where) => { const [lo, hi] = await p.$eval(sel, e => [+e.min, +e.max]); for (let v = lo; v <= hi; v++) { await p.evaluate((s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input')) }, sel, v); actions++; await wait(20); await bad(where + ' ' + sel + '=' + v) } };
  const tab = async t => { await p.evaluate(t => document.querySelector(`#tabs button[data-t="${t}"]`).click(), t); actions++; await wait(150); await bad('tab ' + t) };
  // Reading: the XSTest animation in every mode, every step; squares tapped
  await bad('read load');
  for (const m of ['llama2orig', 'mistralinstruct', 'gpt4']) {
    await p.evaluate(m => document.querySelector(`#xa-mode button[data-m="${m}"]`).click(), m); actions++;
    await setRange('#xa-ctl-s', 'xa ' + m);
    if (scheme === 'dark') out['xa_' + m] = await p.$eval('#xa-cnt', e => e.innerText);
    for (const k of [0, 120, 300, 449]) { await fire('#xa-svg rect[data-i]', k); actions++; await bad('xa square ' + k) }
  }
  await p.click('#xa-ctl-p'); await wait(400); await p.click('#xa-ctl-p'); await p.click('#xa-ctl-b'); await p.click('#xa-ctl-f'); actions += 4;
  await p.select('#xa-ctl-v', '2'); actions++;
  if (scheme === 'dark') { out.gr_tab = await p.$eval('#gr-tab', e => e.innerText); out.gr_note = await p.$eval('#gr-note', e => e.innerText); }
  await clickAll('#rd-check input', 'checklist');
  await clickAll('#t-read a[data-tab]', 'tab links'); await tab('t-read');
  // XSTest tab
  await tab('t-xs');
  await setSel('#xs-g', 'xs grader', async g => { if (scheme === 'dark') out['xs_hm_' + g] = await p.$eval('#xs-hm', e => e.innerText) });
  await p.click('#xs-part'); actions++; await bad('xs part off'); await p.click('#xs-part'); actions++;
  await setSel('#xs-type', 'xs type'); await p.select('#xs-type', ''); 
  await setSel('#xs-f', 'xs filter', async f => { if (scheme === 'dark') out['xs_n_' + f] = await p.$eval('#xs-n', e => e.innerText) });
  await p.select('#xs-f', 'all');
  await clickAll('#xs-list .xs-row', 'xs rows', 45);
  await clickAll('#xs-hm td.v', 'xs cells', 7);
  await clickAll('#xs-pre button', 'xs presets');
  if (scheme === 'dark') out.strmatch = await p.evaluate(() => ['I cannot help', ' Sorry, no', 'No. Never', 'Here is how', 'As an AI I think', "It's not ethical"].map(s => window.XS_STRMATCH(s)[0]));
  // HarmBench tab
  await tab('t-hb');
  await setSel('#hb-set', 'hb set', async () => { await setSel('#hb-sort', 'hb sort') });
  await p.select('#hb-set', 'test_standard');
  await setSel('#hb-a1', 'hb a1'); await p.select('#hb-a1', 'DR');
  await setSel('#hb-a2', 'hb a2'); await p.select('#hb-a2', 'TAP-T'); actions += 2;
  if (scheme === 'dark') out.hb_sum = await p.$eval('#hb-sum', e => e.innerText);
  // Further reading
  await tab('t-more'); await clickAll('#t-more a[data-tab]', 'more tab links');
  if (errs.length) problems.push(`${scheme}${width}: ` + errs.join(' | '));
  await p.close();
}
await b.close();
fs.writeFileSync(path.join(here, 'js_out.json'), JSON.stringify(out, null, 1));
console.log('actions', actions, 'problems', problems.length); problems.slice(0, 30).forEach(x => console.log(' ', x));
