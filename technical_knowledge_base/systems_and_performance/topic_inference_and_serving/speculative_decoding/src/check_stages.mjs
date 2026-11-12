// The 2026-11-06 rollout checks for Speculative decoding: every 3D stage and the 2D rule animation play by themselves once scrolled into view,
// step to their last step, have one step-list item per step, never move under reduced motion; the numbers in the stages' step lists match
// what the scenes compute from the page's data (window.SD_STG); no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px.
// usage (from the repo root): node <page>/src/check_stages.mjs [shots dir]   (needs html_utils' node_modules)
// Adapted from Sampling and decoding (src/check_stages.mjs).
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero', 'stg-xo', 'stg-dr', 'stg-tree'];
// [card, controls, {mode: step list}, mode buttons, data attribute]
const ANIMS = [['sd-rule-card', 'sd-rule-ctl', { lev: 'sx-rule-lev', sac: 'sx-rule-sac' }, 'sd-rule-mode', 'm']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => ({ bad: (document.getElementById('t-read').innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }));
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) { // the step lists quote the numbers the scenes draw
    const miss = await p.evaluate(() => {
      const G = window.SD_STG, out = [], f2 = v => v.toFixed(2);
      const has = (id, xs) => { const t = document.getElementById(id).textContent; xs.forEach(x => { if (!t.includes(x)) out.push(id + ': ' + x) }) };
      const h = G.hero, q = h.pos[h.acc];
      if (h.acc !== 3 || h.out !== 4) out.push('hero: expected 3 kept guesses');
      has('sx-hero', h.pos.map(x => '“' + x.g + '”'), );
      has('sx-hero', ['“' + q.t + '” (' + q.pt.toFixed(3) + ')', 'q is its probability for each guess (' + f2(q.q) + ' for “' + q.g + '”)', h.pos.slice(0, 3).map(x => f2(x.p)).join(', ') + ' and ' + q.p.toFixed(3),
        h.T.plain.toFixed(2), f2(h.hr) + ' pass', f2(h.T.h100), h.r5.toFixed(2) + 'x', h.cd.toFixed(2) + 'x', f2(h.T.m1), 'yields ' + h.out + ' tokens']);
      const x = G.xo, [a, c, d, e] = x.S1, l64 = x.S8[2];
      if (!x.check) out.push('xo: scene step times differ from SD.h100t');
      has('sx-xo', [f2(a.p.tm) + ' ms', f2(a.p.tc) + ' ms', f2(a.p.t) + ' ms', f2(a.s.tc) + ' ms', f2(a.d) + ' ms', f2(a.sp) + 'x', 'yields ' + f2(x.E) + ' tokens',
        f2(c.p.tm) + ' ms', f2(c.p.tc) + ' ms', f2(c.s.tc) + ' ms', f2(c.sp) + 'x', f2(d.s.tc) + ' ms', f2(d.p.tm) + ' ms', f2(d.s.t) + ' ms', f2(d.p.t) + ' ms', f2(d.sp) + 'x',
        f2(e.p.tc) + ' ms', f2(e.p.tm) + ' ms', f2(e.s.tc) + ' ms', f2(e.sp) + 'x', f2(l64.p.tm) + ' ms', Math.round(x.kv8) + ' GB']);
      if (x.S8.slice(0, 3).some(c => f2(c.sp) !== f2(x.S8[0].sp))) out.push('xo: long-context speed-ups differ between batches');
      const r = G.dr; has('sx-dr', [f2(r.ng.code), f2(r.ng.story), f2(r.sm.code), f2(r.sm.story), f2(r.ea.code), f2(r.ea.story), f2(r.df.code), f2(r.df.story)]);
      const t = G.tree; has('sx-tree', [String(t.npos) + ' positions', ...t.means.map(([n, v]) => n.replace(/(\w+) (\d+)/, '$1 of $2') + ' ' + f2(v))]);
      return out;
    });
    miss.forEach(x => problems.push('step list number missing: ' + x));
    const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
    if (!cols.length || cols.some(c => c !== 'grid')) problems.push(`${tag}: a Reading split is not two columns`);
    await p.click('#tabs button[data-t="t-sddr"]'); await wait(300);
    const c2 = await p.$$eval('#t-sddr .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (!c2.length || c2.some(d => d !== 'grid')) problems.push(`${tag}: Drafters measured split not two columns`);
    await p.screenshot({ path: `${shots}/x-tab-t-sddr-${scheme}-${width}.png` });
    await p.click('#tabs button[data-t="t-read"]'); await wait(300);
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
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('sd-s8').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step; list length; screenshot mid-way and at the end
  for (const id of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
    const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-mid-${scheme}-${width}.png` }) }
    }
    await wait(2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    if (width !== 920) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-last-${scheme}-${width}.png` }) }
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k);
  }
  // the tree stage's examples: each redraws without errors
  const nex = await p.$$eval('#tree-ex button', bs => bs.length);
  for (let i = 0; i < nex; i++) { await p.evaluate(i => document.querySelectorAll('#tree-ex button')[i].click(), i); await wait(150); await audit('tree example ' + i) }
  for (const [card, ctl, lists, seg, at] of ANIMS) {
    for (const [m, lid] of Object.entries(lists)) {
      if (seg) { await p.$eval(`#${seg} button[data-${at}="${m}"]`, e => e.click()); await wait(100); }
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
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of /.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(r)) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
