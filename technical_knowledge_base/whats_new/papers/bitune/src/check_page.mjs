// Exercise every control of the page in both themes and widths, and check what checkpage.sh does not:
// SVG text at least 11 px on screen (font size times the SVG's screen scale), no NaN/undefined/Infinity
// in visible text, no errors, no sideways scroll, and the 3D stage playing on view and stepping end to end.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/bitune/src/check_page.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots');
const b = await puppeteer.launch({ headless: true });
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
    // the 2026-11-06 motion rule (inverted from the 2026-10-25 never-autoplay check): a stage plays by itself once scrolled into view
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0); if (!fr) problems.push(`${scheme} ${width}: ${id} did not play when scrolled into view`);
      actions++;
    }
    // open every closed block and audit what it shows
    await p.$$eval(`#${t} details`, ds => ds.forEach(d => d.open = true)); await audit(t + ' details open');
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
      const info = await p.$eval('#' + id, b => ({ vis: b.offsetParent !== null, chip: b.id === 'rtGo', pred: !!b.closest('.pred'), go: false }));
      if (!info.vis || info.chip || info.pred) continue;
      await clk('#' + id).catch(() => {}); actions++;
      if (info.go) { await p.waitForFunction(() => !document.getElementById('tstGo').disabled, { timeout: 120000 }); }
    }
    // segmented controls (data-m buttons)
    const segs = await p.$$(`#${t} .seg button`);
    for (const s of segs) { if (await s.evaluate(b => b.offsetParent !== null)) { await s.evaluate(b => b.click()); actions++; await wait(30) } }
    await audit(t + ' after controls');
    if (t === 't-run') {
      // run the in-browser test for the shipped Bitune model and LoRA and check the counts finish
      for (const v of ['bitune', 'lora']) {
        await p.select('#rtVar', v); await p.select('#rtN', '100'); await clk('#rtGo'); actions += 3;
        await p.waitForFunction(() => !document.getElementById('rtGo').disabled, { timeout: 120000 });
        const o = await p.$eval('#rtOut', e => e.innerText); if (!/of 100/.test(o)) problems.push(`${scheme} ${width}: in-browser test ${v} did not finish: ${o.slice(0, 80)}`);
        console.log(scheme, width, 'in-browser test', o.slice(0, 120));
      }
      await audit('t-run after test');
    }
    // step every stage to its end through its forward button (check_stages.mjs checks the step lists, both modes and reduced motion)
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      for (let k = 0; k < n; k++) { await clk(`#${id}-f`); actions++ }
      await wait(1700); await audit(`${t} ${id} stepped`);
    }
  }
  if (errs.length) problems.push(`${scheme} ${width}: errors ${errs.join(' | ')}`);
  await p.close();
}
await b.close();
console.log('actions', actions, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
