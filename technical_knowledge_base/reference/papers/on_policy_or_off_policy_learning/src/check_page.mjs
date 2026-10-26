// Exercise every control of the page in both themes and widths, and check what checkpage.sh does not:
// SVG text at least 11 px on screen, no NaN/undefined/Infinity in visible text, no errors, no sideways scroll,
// the before/after animation stepped end to end in all four modes, the in-browser sweep matching the record,
// and reduced motion (no autoplay). Card screenshots go to .shots/ (gitignored).
// usage (from the repo root): node technical_knowledge_base/reference/papers/on_policy_or_off_policy_learning/src/check_page.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const puppeteer = createRequire(path.resolve(here, '../../../../../html_utils/package.json'))('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, args: process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : [] });
const problems = []; let actions = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file);
  const audit = async where => {
    const r = await p.evaluate(() => {
      const small = [];
      document.querySelectorAll('.tab:not([hidden]) svg text').forEach(t => {
        const m = t.ownerSVGElement && t.ownerSVGElement.getScreenCTM(); if (!m) return;
        const fs = parseFloat(getComputedStyle(t).fontSize) * m.a;
        if (fs < 10.95 && t.getBoundingClientRect().width > 0) small.push(t.textContent.slice(0, 30) + ' ' + fs.toFixed(1));
      });
      const vis = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' ');
      const bad = vis.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || [];
      const box = document.getElementById('jsErr');
      return { small: [...new Set(small)].slice(0, 6), bad, side: document.documentElement.scrollWidth > innerWidth, eb: box && !box.hidden ? box.textContent : '' };
    });
    if (r.small.length) problems.push(`${scheme} ${width} ${where}: text under 11px: ${r.small.join(' | ')}`);
    if (r.bad.length) problems.push(`${scheme} ${width} ${where}: ${r.bad.join(' | ')}`);
    if (r.side) problems.push(`${scheme} ${width} ${where}: sideways scroll`);
    if (r.eb) problems.push(`${scheme} ${width} ${where}: error box: ${r.eb}`);
  };
  const shot = async (sel, name) => { const el = await p.$(sel); if (!el) { problems.push('missing ' + sel); return } await el.evaluate(e => e.scrollIntoView()); await wait(150); await el.screenshot({ path: `${shots}/${name}-${scheme}-${width}.png` }) };
  for (const t of await p.$$eval('#tabs button', bs => bs.map(x => x.dataset.t))) {
    await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300); await audit(t + ' open');
    // nothing may move before the reader acts, with or without reduced motion (2026-10-26)
    if (await p.$(`#${t} #ba`)) { await p.$eval('#ba', e => e.scrollIntoView()); await wait(1200); const fr = await p.$eval('#ba', e => +e.dataset.frames || 0); if (fr) problems.push(`${scheme} ${width}: ba moved before a click (${fr} frames)`) }
    // the hero figure is drawn on the reading tab
    if (t === 't-read' && !(await p.$eval('#heroSvg', e => !!e.querySelector('svg rect')))) problems.push(`${scheme} ${width}: hero figure empty`);
    // open every closed block and audit what it shows
    await p.$$eval(`#${t} details`, ds => ds.forEach(d => d.open = true)); await audit(t + ' details open');
    for (const pr of await p.$$(`#${t} .pred`)) { const bs = await pr.$$('.opts button'); await bs[bs.length - 1].evaluate(x => x.click()); await bs[0].evaluate(x => x.click()); actions += 2 }
    for (const id of await p.$$eval(`#${t} input[type=range]`, xs => xs.map(x => x.id))) {
      for (const f of [0, .5, 1, .25]) { await p.evaluate((id, f) => { const e = document.getElementById(id); e.value = +e.min + (e.max - e.min) * f; e.dispatchEvent(new Event('input', { bubbles: true })) }, id, f); actions++ }
      await audit(t + ' range ' + id);
    }
    for (const id of await p.$$eval(`#${t} select`, xs => xs.map(x => x.id))) {
      const n = await p.$eval('#' + id, e => e.options.length);
      for (let i = 0; i < n; i++) { await p.evaluate((id, i) => { const e = document.getElementById(id); e.selectedIndex = i; e.dispatchEvent(new Event('change', { bubbles: true })) }, id, i); actions++ }
      await audit(t + ' select ' + id);
    }
    const segs = await p.$$(`#${t} .seg button`);
    for (const s of segs) { if (await s.evaluate(x => x.offsetParent !== null)) { await s.evaluate(x => x.click()); actions++; await wait(40) } }
    await audit(t + ' segments');
    for (const s of segs) { if (await s.evaluate(x => x.offsetParent !== null && x === x.parentElement.firstElementChild)) { await s.evaluate(x => x.click()); await wait(40) } }
    if (t === 't-read') { for (const c of ['#heroFig', '#f1', '#gr', '#f3', '#f5', '#f6']) await shot(c, 'read' + c.slice(1)); await shot('#hero', 'hero') }
    if (t === 't-run') {
      // the four before/after modes, each stepped to its last checkpoint
      for (const m of ['f-1', 'f1', 'r-1', 'r1']) {
        await p.$eval(`#baM button[data-m="${m}"]`, e => e.click()); await wait(60);
        for (let i = 0; i < 16; i++) { await p.$eval('#baFwd', e => e.click()); actions++ }
        const st = await p.$eval('#baStep', e => e.textContent); if (!/16 of 16/.test(st)) problems.push('animation did not reach its end in mode ' + m + ': ' + st);
        await audit('t-run anim ' + m);
      }
      await shot('#ba', 'run-ba'); await shot('#sl', 'run-sl'); await shot('#tr', 'run-tr'); await shot('#chkOut', 'run-chk');
      await p.$eval('#ba', e => e.scrollIntoView()); await p.$eval('#baBack', e => e.click()); await p.$eval('#baBack', e => e.click()); await p.$eval('#baPlay', e => e.click()); await wait(500); await shot('#ba', 'run-ba-mid');
      if (width === 920) {
        await p.$eval('#trGo', e => e.click()); actions++;
        await p.waitForFunction(() => /largest difference/.test(document.getElementById('trOut').textContent), { timeout: 120000 });
        const o = await p.$eval('#trOut', e => e.textContent); const d = +o.match(/recorded sweep ([0-9.e+-]+)/)[1];
        if (!(d <= 1e-4)) problems.push('in-browser sweep differs from the record: ' + o);
        console.log('sweep rerun:', o.trim());
      }
    }
    if (t === 't-tables') { await shot('#tbClaimsOut', 'tables-claims'); await shot('#tbF1', 'tables-f1') }
    await audit(t + ' after controls');
  }
  if (errs.length) problems.push(`${scheme} ${width}: ${errs.join(' | ')}`);
  await p.close();
}
// reduced motion: nothing animates on its own
{
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.$eval('#tabs button[data-t=t-run]', e => e.click()); await p.$eval('#ba', e => e.scrollIntoView()); await wait(1200);
  const f = await p.$eval('#ba', e => +e.dataset.frames || 0); if (f) problems.push('animation autoplayed under reduced motion (' + f + ' frames)');
  await p.close();
}
await b.close();
console.log(`actions ${actions}, problems ${problems.length}`); problems.forEach(x => console.log('  ' + x));
process.exit(problems.length ? 1 : 0);
