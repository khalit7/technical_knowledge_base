// Exercise every control of the page in both themes and widths, and check what checkpage.sh does not:
// SVG text at least 11 px on screen, no NaN/undefined/Infinity in visible text, no errors, no sideways scroll,
// the Fig. 1 stage (since 2026-11-13: plays by itself once scrolled into view, stepped to its last step), the in-browser sweep
// matching the record, and reduced motion (nothing moves by itself). Card screenshots go to .shots/ (gitignored).
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/on_policy_or_off_policy_learning/src/check_page.mjs [shots dir]
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
    // the stage plays by itself once scrolled into view (2026-11-06 rule; it used to be forbidden), then steps to its end
    if (await p.$(`#${t} #stg-kn`)) { await p.$eval('#stg-kn', e => e.scrollIntoView({ block: 'center' })); await wait(2200); const fr = await p.$eval('#stg-kn', e => +e.dataset.frames || 0); if (!fr) problems.push(`${scheme} ${width}: stg-kn did not play when scrolled into view`);
      const n = await p.$eval('#stg-kn-r', e => +e.max + 1); for (let i = 1; i < n; i++) { await p.$eval('#stg-kn-f', e => e.click()); actions++ } await wait(1800);
      const st = await p.$eval('#stg-kn .stg-st', e => e.textContent); if (st !== `step ${n} of ${n}`) problems.push(`${scheme} ${width}: stg-kn ended on ${st}`); await audit(t + ' stage end') }
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
    if (t === 't-read') { for (const c of ['#heroFig', '#stg-kn', '#f1', '#gr', '#f3', '#f5', '#f6']) await shot(c, 'read' + c.slice(1)); await shot('#hero', 'hero') }
    if (t === 't-run') {
      await shot('#sl', 'run-sl'); await shot('#tr', 'run-tr'); await shot('#chkOut', 'run-chk');
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
  await p.$eval('#tabs button[data-t=t-read]', e => e.click()); await p.$eval('#stg-kn', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const f = await p.$eval('#stg-kn', e => +e.dataset.frames || 0), pl = await p.$eval('#stg-kn-p', e => /Pause/.test(e.textContent)); if (f || pl) problems.push('stage moved by itself under reduced motion (' + f + ' frames)');
  await p.close();
}
await b.close();
console.log(`actions ${actions}, problems ${problems.length}`); problems.forEach(x => console.log('  ' + x));
process.exit(problems.length ? 1 : 0);
