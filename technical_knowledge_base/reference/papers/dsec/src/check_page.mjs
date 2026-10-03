// Exercise every control of the DSec page in both themes and widths: SVG text at least 11 px on screen,
// no NaN/undefined/Infinity in visible text, no errors, no sideways scroll, every animation stepped end to end
// in every mode, mid-animation screenshots. usage (repo root): node technical_knowledge_base/reference/papers/dsec/src/check_page.mjs
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
let problems = [], actions = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file);
  const audit = async (where) => {
    const r = await p.evaluate(() => {
      const small = [], over = [];
      document.querySelectorAll('.tab:not([hidden]) svg text').forEach(t => {
        const svg = t.ownerSVGElement, m = svg && svg.getScreenCTM(); if (!m) return;
        const fs = parseFloat(getComputedStyle(t).fontSize) * m.a;
        if (fs < 10.95 && t.getBoundingClientRect().width > 0) small.push(t.textContent.slice(0, 30) + ' ' + fs.toFixed(1));
        const r = t.getBoundingClientRect(), sr = svg.getBoundingClientRect();
        if (r.width > 0 && (r.left < sr.left - 2 || r.right > sr.right + 2)) over.push(t.textContent.slice(0, 30));
      });
      const vis = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' ');
      const bad = (vis.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []);
      const box = document.getElementById('jsErr'); const eb = box && !box.hidden ? box.textContent : '';
      return { small: [...new Set(small)].slice(0, 8), over: [...new Set(over)].slice(0, 8), bad, sideways: document.documentElement.scrollWidth > innerWidth, eb };
    });
    if (r.small.length) problems.push(`${scheme} ${width} ${where}: text under 11px: ${r.small.join(' | ')}`);
    if (r.over.length) problems.push(`${scheme} ${width} ${where}: SVG text outside its chart: ${r.over.join(' | ')}`);
    if (r.bad.length) problems.push(`${scheme} ${width} ${where}: ${r.bad.join(' | ')}`);
    if (r.sideways) problems.push(`${scheme} ${width} ${where}: sideways scroll`);
    if (r.eb) problems.push(`${scheme} ${width} ${where}: error box: ${r.eb}`);
  };
  const clk = sel => p.$eval(sel, e => e.click());
  const tabs = await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t));
  for (const t of tabs) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300); await audit(t + ' open');
    for (const pr of await p.$$(`#${t} .pred`)) { const bs = await pr.$$('.opts button'); if (bs.length) { await bs[bs.length - 1].evaluate(b => b.click()); await bs[0].evaluate(b => b.click()); actions += 2; await wait(100) } }
    await audit(t + ' predicts');
    for (const id of await p.$$eval(`#${t} input[type=range]`, xs => xs.map(x => x.id))) {
      for (const f of [0, .5, 1, .5]) { await p.evaluate((id, f) => { const e = document.getElementById(id); e.value = Math.round(+e.min + (e.max - e.min) * f); e.dispatchEvent(new Event('input', { bubbles: true })) }, id, f); actions++ }
      await audit(t + ' range ' + id);
    }
    for (const id of await p.$$eval(`#${t} select`, xs => xs.map(x => x.id))) {
      const n = await p.$eval('#' + id, e => e.options.length);
      for (let i = 0; i < n; i++) { await p.evaluate((id, i) => { const e = document.getElementById(id); e.selectedIndex = i; e.dispatchEvent(new Event('change', { bubbles: true })) }, id, i); actions++ }
      await p.evaluate(id => { const e = document.getElementById(id); e.selectedIndex = 1; e.dispatchEvent(new Event('change', { bubbles: true })) }, id);
    }
    // every visible plain button (figure picker, seed, ...)
    const ids = await p.$$eval(`#${t} button`, bs => bs.map((b, i) => { if (!b.id && !b.dataset.m && !b.closest('.pred')) b.id = 'xb' + i + Math.random().toString(36).slice(2, 6); return b.id || null }).filter(Boolean));
    for (const id of ids) {
      if (/(Play|Back|Fwd)$/.test(id)) continue;
      const vis = await p.$eval('#' + id, b => b.offsetParent !== null).catch(() => false); if (!vis) continue;
      await clk('#' + id).catch(() => {}); actions++; await wait(60);
      if (t === 't-figs') { await audit(t + ' figure ' + id); if (width === 920 || id === 'fs_f12') await (await p.$('#figChart')).screenshot({ path: `${shots}/fig-${id}-${scheme}-${width}.png` }).catch(() => {}) }
    }
    // animations: every mode, every step forward and back, and a mid-play frame
    for (const card of await p.$$eval(`#${t} .card`, cs => cs.filter(c => c.querySelector('.an-play')).map(c => c.id))) {
      const modes = await p.$$eval(`#${card}M button`, bs => bs.map(b => b.dataset.m));
      for (const m of modes) {
        await clk(`#${card}M button[data-m="${m}"]`); await wait(50); await clk(`#${card}Play`); // pause
        for (let i = 0; i < 12; i++) { await clk(`#${card}Fwd`); actions++ }
        await audit(`${t} ${card} ${m} end`);
        const step = await p.$eval(`#${card}Step`, e => e.textContent);
        if (!/Step (\d+) of \1/.test(step)) problems.push(`${scheme} ${width} ${card} ${m}: did not reach the last step: ${step}`);
        for (let i = 0; i < 12; i++) await clk(`#${card}Back`);
        await clk(`#${card}Fwd`); await clk(`#${card}Fwd`);
        await clk(`#${card}Play`); await wait(700);
        const el = await p.$('#' + card); await el.scrollIntoView(); await wait(400);
        await el.screenshot({ path: `${shots}/anim-${card}-${m}-${scheme}-${width}.png` });
        await audit(`${t} ${card} ${m} mid-play`);
        await clk(`#${card}Play`).catch(() => {});
      }
      // scrub to the middle
      await p.evaluate(c => { const s = document.getElementById(c + 'Scrub'); s.value = Math.round(s.max / 2); s.dispatchEvent(new Event('input', { bubbles: true })) }, card);
      await audit(`${t} ${card} scrubbed`);
    }
    // segmented controls (Table 1 scenarios)
    for (const s of await p.$$(`#${t} .seg button`)) { if (await s.evaluate(b => b.offsetParent !== null)) { await s.evaluate(b => b.click()); actions++ } }
    await audit(t + ' after controls');
  }
  if (errs.length) problems.push(`${scheme} ${width}: console errors: ${errs.join(' | ')}`);
  await p.close();
}
// the placement table should rank the policies as the tab says at the defaults
const p = await b.newPage(); await p.goto(file); await p.$eval('#tabs button[data-t=t-run]', e => e.click()); await wait(300);
const rows = await p.$$eval('#pbTab tr', rs => rs.map(r => [...r.cells].map(c => c.textContent)));
console.log('placement table at defaults:', JSON.stringify(rows));
await b.close();
console.log(problems.length ? problems.join('\n') : 'no problems', `\nactions ${actions}`);
