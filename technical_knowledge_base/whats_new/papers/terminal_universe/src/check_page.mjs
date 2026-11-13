// Exercise every control of the page in both themes and widths, and check what checkpage.sh does not:
// SVG text at least 11 px on screen (font size times the SVG's screen scale), no NaN/undefined/Infinity
// in visible text, no errors, no sideways scroll, and the three 3D stages (stg-fl, stg-mr, stg-rr) stepping end to end in every mode and trace.
// Since 2026-11-13 a stage must play by itself once scrolled into view (it used to be forbidden); src/check_stages.mjs checks the motion rules in detail.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/terminal_universe/src/check_page.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); (await import('node:fs')).mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, protocolTimeout: 240000 });
let problems = [], actions = 0;
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
    const r = await p.evaluate(() => {
      const small = [];
      document.querySelectorAll('.tab:not([hidden]) svg text').forEach(t => {
        const svg = t.ownerSVGElement, m = svg && svg.getScreenCTM(); if (!m) return;
        const fs = parseFloat(getComputedStyle(t).fontSize) * m.a;
        if (fs < 10.95 && t.getBoundingClientRect().width > 0) small.push(t.textContent.slice(0, 30) + ' ' + fs.toFixed(1));
        t.querySelectorAll('tspan').forEach(s => { const f2 = parseFloat(getComputedStyle(s).fontSize) * m.a; if (f2 < 10.95) small.push('tspan ' + s.textContent + ' ' + f2.toFixed(1)) });
      });
      const vis = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' ');
      const bad = (vis.match(/.{0,30}(?<![-\w])(NaN|undefined|Infinity)\b.{0,30}/g) || []);
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
    // every stage plays by itself once scrolled into view (2026-11-06 rule; this check used to forbid it)
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1800);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0); if (!fr) problems.push(`${scheme} ${width}: ${id} did not play when scrolled into view`) }
    // closed details hold text too: open them all
    await p.evaluate(t => document.querySelectorAll('#' + t + ' details').forEach(d => d.open = true), t); await wait(400); await audit(t + ' details open');
    // predict widgets: answer each (wrong first, then right)
    const preds = await p.$$(`#${t} .pred`);
    for (const pr of preds) { const bs = await pr.$$('.opts button'); if (bs.length) { await bs[bs.length - 1].evaluate(b => b.click()); await bs[0].evaluate(b => b.click()); actions += 2 } }
    // ranges: min, middle, max
    for (const id of await p.$$eval(`#${t} input[type=range]`, xs => xs.map(x => x.id).filter(Boolean))) {
      for (const f of [0, .5, 1]) { await p.evaluate((id, f) => { const e = document.getElementById(id); e.value = +e.min + (e.max - e.min) * f; e.dispatchEvent(new Event('input', { bubbles: true })) }, id, f); actions++ }
      await audit(t + ' range ' + id);
    }
    // selects: every option
    for (const id of await p.$$eval(`#${t} select`, xs => xs.map(x => x.id).filter(Boolean))) {
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
      const info = await p.$eval('#' + id, b => ({ vis: b.offsetParent !== null, chip: false, pred: !!b.closest('.pred'), go: b.id === 'tstGo' }));
      if (!info.vis || info.chip || info.pred) continue;
      await clk('#' + id).catch(() => {}); actions++;
      if (info.go) { await p.waitForFunction(() => !document.getElementById('tstGo').disabled, { timeout: 120000 }); }
    }
    // segmented controls (data-m buttons)
    const segs = await p.$$(`#${t} .seg button`);
    for (const s of segs) { if (await s.evaluate(b => b.offsetParent !== null)) { await s.evaluate(b => b.click()); actions++; await wait(30) } }
    await audit(t + ' after controls');
    // step the animations through every step and screenshot the middle; the replay is stepped for every episode
    // the stages: every mode (fl, rr) and every trace (rr), stepped to the end with the forward button, a screenshot at the middle step
    for (const [id, seg, picks] of [['stg-fl', 'flM', null], ['stg-mr', null, null], ['stg-rr', 'rrM', '#rtPick button']]) {
      if (!(await p.$(`#${t} #${id}`))) continue;
      const eps = picks ? await p.$$eval(picks, bs => bs.map(b => b.dataset.i)) : [null];
      for (const ep of eps) {
        if (ep != null) { await clk(`#rtPick button[data-i="${ep}"]`); actions++ }
        const modes = seg ? await p.$$eval(`#${seg} button`, bs => bs.map(b => b.dataset.m)) : [null];
        for (const m of modes) {
          if (m) { await clk(`#${seg} button[data-m="${m}"]`); actions++ }
          await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
          const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
          for (let k = 1; k < n; k++) { await clk(`#${id}-f`); actions++; if (k === Math.floor(n / 2) && (ep == null || ep === '0' || ep === '2')) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${ep || 0}-${(m || 'x')}-${scheme}-${width}.png` }) } }
          await wait(1700);
          const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${scheme} ${width}: ${id} ${ep} ${m} ended on ${shown}`);
          await audit(`${t} ${id} ${ep} ${m} stepped`);
          for (let k = 1; k < n; k++) { await clk(`#${id}-b`); actions++ }
        }
      }
    }
  }
  if (errs.length) problems.push(`${scheme} ${width}: errors ${errs.join(' | ')}`);
  await p.close();
}
await b.close();
console.log('actions', actions, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
