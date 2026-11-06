// The 2026-11-06 rollout checks: every 3D stage and the Fig. 5 animation play by themselves once scrolled into view, step to their last step,
// have one step-list item per step, never move under reduced motion, and flows stop off screen; no errors, NaN, undefined or sideways scroll;
// the split layout is two columns at 1400 px. Also: the numbers written in Fig. 5's step list equal the page's own simulation.
// usage: node src/check_stages.mjs [shots dir]   (from the page folder or the repo root; needs html_utils' node_modules)
// (adapted from Building a harness's check_stages.mjs)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
const STAGES = ['stg-hero', 'stg-scaf', 'stg-grp', 'stg-ds'];
const MODES = { 'stg-ds': ['tj-fm', 'm', ['local', 'haiku']] }; // stage: [chips, data attribute, modes]
const ANIMS = [['ht-curcard', 'ht-curctl', 'sx-cur']]; // [card, controls, step list]
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
const problems = [];
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => { const t = [...document.querySelectorAll('.tab')].find(x => !x.hidden);
      return { bad: (t.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) { // two columns where a section has a visual, in every tab that has a split
    for (const t of ['t-read', 't-scaf', 't-env']) {
      await p.click(`#tabs button[data-t="${t}"]`); await wait(250);
      const cols = await p.$$eval(`#${t} .s3sp`, xs => xs.map(x => getComputedStyle(x).display));
      if (!cols.length || cols.some(c => c !== 'grid')) problems.push(`${tag}: ${t} split not two columns (${cols})`);
      await audit(t);
    }
    await p.click('#tabs button[data-t="t-read"]'); await wait(250);
  }
  // autoplay on view
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view (the Depth section at the end)
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rs9').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step, in every mode; list length; screenshot mid-way
  for (const id of STAGES) {
    const md = MODES[id], modes = md ? md[2] : [null];
    for (const m of modes) {
      if (m) await p.$eval(`#${md[0]} button[data-${md[1]}="${m}"]`, e => e.click());
      await p.$eval(`#${id}-b`, e => e.click());
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
      for (let k = 1; k < n; k++) {
        await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
        if (k === Math.floor(n / 2) && (!m || m === modes[0])) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) }
      }
      await wait(2600);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m || ''} ended on ${sh}`);
      if (!m || m === modes[0]) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-last-${scheme}-${width}.png` }) }
      await audit(`${id} ${m || ''} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k);
    }
  }
  { // the group chooser and its chips redraw Fig. 3 on the chosen group
    const opts = await p.$eval('#ht-advsel', s => s.options.length);
    for (const i of [0, opts - 1]) { await p.evaluate(i => { const s = document.getElementById('ht-advsel'); s.selectedIndex = i; s.dispatchEvent(new Event('change')) }, i); await wait(200) }
    for (const sel of ['#ht-advrew button', '#ht-advnorm button']) { const n = await p.$$eval(sel, x => x.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await wait(120) } }
    await audit('Fig. 3 chooser');
  }
  for (const [card, ctl, lid] of ANIMS) {
    await p.$eval(`#${ctl}-b`, e => e.click());
    await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} has ${n} steps but list ${lid} shows ${lis}`);
    for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-${scheme}-${width}.png` }) } }
    const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} list marks ${on}, not the last step`);
    await audit(card);
  }
  if (width === 1400) { // Fig. 5's step list quotes the page's own simulation
    const r = await p.evaluate(() => { const g = HTX.curGet('greedy'), d = HTX.curGet('guard'), f = (a, k) => ((a[k] - a[0]) * 100).toFixed(1);
      return { want: [f(g.vis, 1), f(g.tru, 1), f(g.vis, 10), f(g.tru, 10), f(g.ho, 10), f(d.vis, 10), f(d.tru, 10), d.accPerSearch.toFixed(1), g.accPerSearch.toFixed(1), Math.round(HTX.simP0 * 100) + '%', (100 * Math.sqrt(HTX.simP0 * (1 - HTX.simP0) / 40)).toFixed(1)], text: document.getElementById('sx-cur').innerText } });
    const miss = r.want.filter(x => !r.text.includes(x)); if (miss.length) problems.push(`Fig. 5 step list lacks the simulation's ${miss.join(', ')}`);
  }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !r[1].startsWith('step 1 of ')) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(r)) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
