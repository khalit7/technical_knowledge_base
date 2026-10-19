// Exercise every control of the page in both themes and widths, and check what checkpage.sh does not:
// SVG text at least 11 px on screen (font size times the SVG's screen scale), no NaN/undefined/Infinity
// in visible text, no errors, no sideways scroll, and the animations stepping end to end.
// usage (from the repo root): node technical_knowledge_base/reference/papers/context_language_models/src/check_page.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots');
const b = await puppeteer.launch({ headless: 'shell', protocolTimeout: 120000, executablePath: process.env.CHROME_PATH || undefined, args: process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : [] });
let problems = [], actions = 0;
import fs from 'node:fs';
fs.mkdirSync(shots, { recursive: true });
// 1. the page's JavaScript replay and calculators agree with recompute.py
{
  const p = await b.newPage(); await p.goto(file);
  const r = await p.evaluate(() => {
    const out = [], R = PAPER.rc.replay, D = Object.assign({}, R.def);
    const cmp = (name, a, e, tol) => { if (Math.abs(a - e) > tol * Math.max(1, Math.abs(e))) out.push(name + ': js ' + a + ' python ' + e) };
    for (const [pol, key, extra] of [['base', 'base', {}], ['summary', 'summary', {}], ['clm', 'clm', {}], ['clm', 'clm_keep1', { clm_keep: 1 }]]) {
      const js = CLMR.simulate(pol, Object.assign({}, D, extra)), py = R.res[key];
      for (const k of ['pflops_std', 'pflops_scr', 'calls', 'actions', 'edits', 'peak', 'mean_prompt', 'prefilled', 'prefilled_scr', 'generated']) cmp(key + ' ' + k, js[k], py[k], 1e-6);
      if (js.steps.length !== py.trace.length) out.push(key + ' steps ' + js.steps.length + ' vs ' + py.trace.length);
      else js.steps.forEach((s, i) => { const t = py.trace[i]; if (s.kind[0] !== t[0] || s.P !== t[1] || s.R !== t[2] || s.G !== t[3] || s.reloc !== t[4]) out.push(key + ' step ' + i + ' differs') });
    }
    for (const [R0, v] of Object.entries(PAPER.rc.fig16)) cmp('fig16 ' + R0, CLMR.bill(20000, 500, +R0).total, v.total, 1e-9);
    return { out, n: Object.keys(R.res).length };
  });
  if (r.out.length) problems.push('JS against recompute.py: ' + r.out.slice(0, 6).join(' | ')); else console.log('JS replay and calculator agree with recompute.py (' + r.n + ' replays, 3 turns)');
  await p.close();
}
// 2. reduced motion: nothing autoplays
{
  const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.setViewport({ width: 920, height: 900 }); await p.goto(file);
  await p.click('#tabs button[data-t=t-run]'); await p.$eval('#rp', e => e.scrollIntoView()); await new Promise(r => setTimeout(r, 1500));
  const fr = await p.$eval('#rp', e => +e.dataset.frames || 0); if (fr) problems.push('reduced motion: the replay autoplayed (' + fr + ' frames)'); else console.log('reduced motion: no autoplay');
  await p.close();
}
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file);
  const tabs = await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t));
  const audit = async (where) => {
    if (process.env.VERBOSE) console.log('audit', scheme, width, where);
    const r = await p.evaluate(() => {
      const small = [];
      document.querySelectorAll('.tab:not([hidden]) svg text').forEach(t => {
        const svg = t.ownerSVGElement, m = svg && svg.getScreenCTM(); if (!m) return;
        const fs = parseFloat(getComputedStyle(t).fontSize) * m.a;
        if (fs < 10.95 && t.getBoundingClientRect().width > 0) small.push(t.textContent.slice(0, 30) + ' ' + fs.toFixed(1));
        t.querySelectorAll('tspan').forEach(s => { const f2 = parseFloat(getComputedStyle(s).fontSize) * m.a; if (f2 < 10.95) small.push('tspan ' + s.textContent + ' ' + f2.toFixed(1)) });
      });
      const vis = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' ');
      const bad = (vis.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []);
      const box = document.getElementById('jsErr'); const eb = box && !box.hidden ? box.textContent : '';
      return { small: [...new Set(small)].slice(0, 8), bad, sideways: document.documentElement.scrollWidth > innerWidth, eb };
    });
    if (r.small.length) problems.push(`${scheme} ${width} ${where}: text under 11px: ${r.small.join(' | ')}`);
    if (r.bad.length) problems.push(`${scheme} ${width} ${where}: ${r.bad.join(' | ')}`);
    if (r.sideways) problems.push(`${scheme} ${width} ${where}: sideways scroll`);
    if (r.eb) problems.push(`${scheme} ${width} ${where}: error box: ${r.eb}`);
  };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const clk = sel => p.$eval(sel, e => e.click()); // DOM click: a sticky nav cannot intercept it
  for (const t of tabs) {
    await p.click(`#tabs button[data-t=${t}]`); await wait(250); await audit(t + ' open');
    // predict widgets: answer each (wrong first, then right)
    const preds = await p.$$(`#${t} .pred`);
    for (const pr of preds) { const bs = await pr.$$('.opts button'); if (bs.length) { await bs[bs.length - 1].evaluate(b => b.click()); await bs[0].evaluate(b => b.click()); actions += 2 } }
    // ranges: min, middle, max
    for (const id of await p.$$eval(`#${t} input[type=range]`, xs => xs.map(x => x.id))) {
      for (const f of [0, .5, 1]) { await p.evaluate((id, f) => { const e = document.getElementById(id); e.value = +e.min + (e.max - e.min) * f; e.dispatchEvent(new Event('input', { bubbles: true })) }, id, f); actions++ }
      await audit(t + ' range ' + id);
    }
    // selects: every option
    for (const id of await p.$$eval(`#${t} select`, xs => xs.map(x => x.id))) {
      const n = await p.$eval('#' + id, e => e.options.length);
      for (let i = 0; i < n; i++) { await p.evaluate((id, i) => { const e = document.getElementById(id); e.selectedIndex = i; e.dispatchEvent(new Event('change', { bubbles: true })) }, id, i); actions++ }
      await audit(t + ' select ' + id);
    }
    // checkboxes
    for (const id of await p.$$eval(`#${t} input[type=checkbox]`, xs => xs.map(x => x.id))) { await clk('#' + id); await clk('#' + id); actions += 2 }
    // every button that is not a tab, chip or predict option, twice; chips a few times (builds a sentence)
    const ids = await p.$$eval(`#${t} button`, bs => bs.map((b, i) => { if (!b.id && !b.dataset.m) b.id = 'xb' + i + Math.random().toString(36).slice(2, 6); return b.id || null }).filter(Boolean));
    for (const id of ids) {
      const ok = await p.$('#' + id); if (!ok) continue;
      const info = await p.$eval('#' + id, b => ({ vis: b.offsetParent !== null, chip: false, pred: !!b.closest('.pred') }));
      if (!info.vis || info.chip || info.pred) continue;
      await clk('#' + id).catch(() => {}); actions++;
    }
    // segmented controls (data-m buttons)
    const segs = await p.$$(`#${t} .seg button`);
    for (const s of segs) { if (await s.evaluate(b => b.offsetParent !== null)) { await s.evaluate(b => b.click()); actions++; await wait(30) } }
    await audit(t + ' after controls');
    // step the animations through every step and screenshot the middle
    for (const id of ['rp']) {
      if (!(await p.$(`#${t} #${id}`))) continue;
      const modes = await p.$$eval(`#${id}M button`, bs => bs.map(b => b.dataset.m)).catch(() => []);
      for (const m of (modes.length ? modes : [null])) {
        if (m) await clk(`#${id}M button[data-m=${m}]`);
        await clk(`#${id}Play`); await clk(`#${id}Play`);
        await p.evaluate(id => { const e = document.getElementById(id + 'Scrub'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
        const n = await p.$eval(`#${id}Scrub`, e => e.max / 100);
        for (let k = 0; k < n; k++) { await clk(`#${id}Fwd`); actions++; if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView()); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${m || 'x'}-${scheme}-${width}.png` }) } }
        await audit(`${t} ${id} ${m} stepped`);
        for (let k = 0; k < n; k++) { await clk(`#${id}Back`); actions++ }
      }
      // let it play for a second
      await clk(`#${id}Play`); await wait(1200);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0); if (!fr) problems.push(`${scheme} ${width}: ${id} did not animate`);
      await clk(`#${id}Play`);
    }
  }
  if (errs.length) problems.push(`${scheme} ${width}: errors ${errs.join(' | ')}`);
  await p.close();
}
await b.close();
console.log('actions', actions, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
