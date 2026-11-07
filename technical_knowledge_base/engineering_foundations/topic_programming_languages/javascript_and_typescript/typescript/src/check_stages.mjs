// The 2026-11-06 rollout checks for "TypeScript: the type system, narrowing and runtime validation": both 3D stages (Fig. 1 hero, Fig. 2
// narrowing) and the erasure stepper play by themselves once scrolled into view, step to their last step in every mode, have one step-list
// item per step and never move under reduced motion; stages stop redrawing off screen; no errors, NaN, undefined or sideways scroll;
// splits are two columns at 1400 px. The numbers in the step lists are checked against the page's own data (window.TB).
// usage (from the repo root or src/): node src/check_stages.mjs [shots dir]   (needs html_utils' node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// [stage, mode chips or null, {mode: step list}]
const STAGES = [['stg-hero', null, { one: 'sx-hero' }], ['stg-nr', 'tbn-prog', { p1: 'sx-nr-p1', p2: 'sx-nr-p2', p3: 'sx-nr-p3', p4: 'sx-nr-p4' }]];
// [card, controls, {mode: step list}, mode buttons]
const ANIMS = [['tb-erase-card', 'tb-erase-ctl', { strip: 'sx-er-strip', emit: 'sx-er-emit' }, 'tb-erase-mode']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
const problems = [];
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.evaluateOnNewDocument(() => { window.__labels = []; const f = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, ...a) { if (window.__labels.length < 5000) window.__labels.push(String(t)); return f.call(this, t, ...a) } });
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    // the page is about TypeScript, so its prose legitimately says undefined and NaN: the audit reads what the scenes drew on their canvases
    // (every label; a member label may be exactly "undefined" or "null") and script-written numbers with units
    const r = await p.evaluate(() => ({ bad: [...(window.__labels || []).filter(t => t !== 'undefined' && t !== 'null' && /\b(NaN|undefined|Infinity|null)\b/.test(t)),
      ...(document.getElementById('t-read').innerText.match(/.{0,30}\b(NaN|undefined|Infinity) ?(ms|s|%|x|characters)\b.{0,10}/g) || [])],
      side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }));
    await p.evaluate(() => { window.__labels = [] });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) {
    const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
    if (!cols.length || cols.some(c => c !== 'grid')) problems.push(`${tag}: a split is not two columns (${cols})`);
  }
  // autoplay on view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  // stages stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('s9').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step in every mode; list length; screenshot mid-way
  for (const [id, chips, lists] of STAGES) {
    for (const [m, lid] of Object.entries(lists)) {
      if (chips) { await p.$eval(`#${chips} button[data-m="${m}"]`, e => e.click()); await wait(100); }
      await p.$eval(`#${id}-b`, e => e.click());
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but list ${lid} shows ${lis}`);
      for (let k = 1; k < n; k++) {
        await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
        if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${m}-${scheme}-${width}.png` }) }
      }
      await wait(2600);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m} ended on ${sh}`);
      if (width === 1400 && scheme === 'light') { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${m}-last-${scheme}-${width}.png` }) }
      await audit(`${id} ${m} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    }
  }
  for (const [card, ctl, lists, seg] of ANIMS) {
    for (const [m, lid] of Object.entries(lists)) {
      await p.$eval(`#${seg} button[data-m="${m}"]`, e => e.click()); await wait(100);
      await p.$eval(`#${ctl}-b`, e => e.click());
      await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${card} ${m} has ${n} steps but list ${lid} shows ${lis}`);
      for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
        if (k === Math.floor(n / 2)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-${m}-${scheme}-${width}.png` }) } }
      const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} ${m} list marks ${on}, not the last step`);
      await audit(`${card} ${m}`);
    }
  }
  if (width === 1400) { // the numbers in the step lists are the page's own data
    const r = await p.evaluate(() => { const out = [], H = window.TB_HERO;
      const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(x => { if (!txt(id).includes(String(x))) out.push(id + ' lacks "' + x + '"') });
      if (!H) out.push('TB_HERO missing'); else {
        need('sx-hero', [H.tc + ' of its ' + H.nb + ' non-blank characters', 'the ' + H.n + ' recorded replies', H.cast.ok + ' printed the right answer', H.cast.silent + ' printed wrong data', 'and ' + H.cast.crash + ' crashed', H.zod.ok + ' pass', H.zod.caught + ' are rejected']);
        if (H.cast.ok + H.cast.silent + H.cast.crash !== H.n || H.zod.ok + H.zod.caught !== H.n) out.push('hero counts do not add up to the replies');
      }
      need('sx-er-strip', [TB_ERASE.typeChars + ' characters are types']); need('sx-er-emit', ['the same ' + TB_ERASE.typeChars + ' characters']);
      for (const p of ['p1', 'p2', 'p3', 'p4']) { const a = TB.narrow[p + '_after'], b = TB.narrow[p + '_before'], l = document.getElementById('sx-nr-' + p);
        if (l.children.length !== a.steps.length + 1) out.push(`sx-nr-${p}: ${l.children.length} items, ${a.steps.length + 1} steps`);
        a.steps.forEach((s, i) => { const t = l.children[i].textContent; if (!t.includes(s.expr + ' is ' + s.type)) out.push(`sx-nr-${p} item ${i + 1} lacks "${s.type}"`); if (!t.startsWith('Line ' + s.line)) out.push(`sx-nr-${p} item ${i + 1} is not line ${s.line}`);
          if (b && (b.steps[i].type !== s.type || b.steps[i].expr !== s.expr) && !t.includes(b.steps[i].expr + ' is ' + b.steps[i].type)) out.push(`sx-nr-${p} item ${i + 1} lacks the before type`) });
        const v = l.children[a.steps.length].textContent;
        [a, b].filter(Boolean).forEach(d => { if (d.tsc.length) d.tsc.filter(x => /^narrow/.test(x)).forEach(x => { if (!v.includes(x)) out.push(`sx-nr-${p} verdict lacks ${x}`) }); else if (!v.includes(d.run.trim())) out.push(`sx-nr-${p} verdict lacks the run output`) }) }
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(r)) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
