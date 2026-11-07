// The 2026-11-06 rollout checks: every 3D stage and every 2D animation plays by itself once scrolled into view, steps to its last step,
// has one step-list item per step, never moves under reduced motion; no errors, NaN, undefined or sideways scroll; split layout at 1400 px.
// usage (from the repo root or src/): node src/check_stages.mjs [shots dir]   (needs html_utils' node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
// (Rust: enums, traits, errors and iterators: adapted from C++ classes, templates and the standard library; three stages (enum layout, generic against
//  trait object, the lazy chain), one autoplaying 2D stepper with three step lists (the ? walk-through); the step lists' numbers are checked against
//  the page's own recordings, window.RA_DATA)
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
const STAGES = ['stg-lay', 'stg-dyn', 'stg-lazy'];
// [card, controls, {mode: step list}, mode buttons, data attribute]
const ANIMS = [['ra-q-card', 'ra-q-ctl', { bad: 'sx-q-bad', missing: 'sx-q-missing', good: 'sx-q-good' }, 'ra-q-seg', 'm']];
const MODES = {};
const WIDGETS = [];
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
    const r = await p.evaluate(() => ({ bad: (document.getElementById('t-read').innerText.replace(/\bNaN (is not comparable|appears|instead)/g, '').match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }));
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) { // two columns where a section has a visual
    const cols = await p.$$eval('.s3sp', xs => xs.map(x => getComputedStyle(x).display));
    if (cols.some(c => c !== 'grid')) problems.push(`${tag}: a split is not two columns`);
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
  // widgets never play by itself
  for (const [card, ctl, tab] of WIDGETS) {
    await p.click(`#tabs button[data-t="${tab}"]`); await wait(300);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(t)) problems.push(`${tag}: widget ${card} played by itself`);
    if (width === 1400) { const c = await p.$$eval(`#${tab} .s3sp`, xs => xs.map(x => getComputedStyle(x).display)); if (c.some(d => d !== 'grid')) problems.push(`${tag}: ${tab} split not two columns`); }
    await p.screenshot({ path: `${shots}/x-tab-${tab}-${scheme}-${width}.png` });
  }
  await p.click('#tabs button[data-t="t-read"]'); await wait(300);
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('ra-coll').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step, in every mode; list length; screenshot mid-way
  for (const id of STAGES) {
    const md = MODES[id], modes = md ? md[2] : [null];
    for (const m of modes) {
      if (m) await p.$eval(`#${md[0]} button[data-${md[1]}="${m}"]`, e => e.click());
      await p.$eval(`#${id}-b`, e => e.click()); // a control: stops autoplay
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
      for (let k = 1; k < n; k++) {
        await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
        if (k === Math.floor(n / 2) && (!m || m === modes[modes.length - 1])) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2800); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) }
      }
      await wait(2800);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m || ''} ended on ${sh}`);
      await audit(`${id} ${m || ''} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k);
    }
  }
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
  { // the numbers written into the step lists are the page's own recordings (RA_DATA: layout.rs, lazy.rs, traits.rs, iterbench.rs)
    const r = await p.evaluate(() => { const out = [], D = RA_DATA;
      const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(x => { if (!txt(id).includes(String(x))) out.push(id + ' lacks "' + x + '"') });
      const g = (t, re) => (t.match(new RegExp(re.source, 'm')) || [])[1];
      const sz = n => g(D.layout, new RegExp('^' + n.replace(/[<>&]/g, c => c) + '\\s+size\\s+(\\d+)'));
      need('sx-lay', ['Option<u8> is ' + sz('Option<u8>') + ' bytes', 'Option<u32> is ' + sz('Option<u32>'), 'at offset ' + g(D.layout, /^Option<u32>: Some's u32 at offset (\d+)/), sz('Option<&u64>') + ' bytes, the same as &u64',
        sz('String') + ' bytes: a capacity', 'printed ' + sz('Conn') + ':', 'still ' + sz('Option<Conn>'), g(D.layout, /^first word of Idle\s+(0x[0-9a-f]+)/), g(D.layout, /^first word of None::<Conn>\s+(0x[0-9a-f]+)/),
        g(D.layout, /^first word of Failed.*?(0x[0-9a-f]+)/) + ', that is ' + parseInt(g(D.layout, /^first word of Failed.*?(0x[0-9a-f]+)/), 16)]);
      if (g(D.layout, /^String "timeout" \(capacity (\d+)/) !== '16') out.push('layout: the String probe is not capacity 16');
      const ev = D.lazy.split('\n'), cut = (a, b) => ev.slice(ev.findIndex(l => a.test(l)) + 1, ev.findIndex(l => b.test(l)));
      const lazy = cut(/^lazy: chain built/, /^lazy: collect returned/).filter(l => /^\s+(filter|map)/.test(l)), eager = cut(/^lazy: collect returned/, /^eager: second Vec/).filter(l => /^\s+(filter|map)/.test(l)), take = cut(/^eager: second Vec/, /^take\(2\)/).filter(l => /^\s+(filter|map)/.test(l));
      const nF = a => a.filter(l => /filter/.test(l)).length, nM = a => a.filter(l => /map/.test(l)).length;
      need('sx-lazy', [g(D.lazy, /one value of (\d+) bytes/) + ' bytes', 'all ' + nF(eager) + ' words', 'runs ' + nM(eager) + ' times', nF(eager) + ' filters, then ' + nM(eager) + ' maps', nF(take) + ' words filtered, ' + nM(take) + ' mapped', 'returns the ' + nM(lazy) + ' words']);
      if (!/Map<.*Filter<.*Iter</.test(D.lazy)) out.push('lazy: the recorded type is not Map<Filter<Iter');
      for (let i = 1; i < lazy.length; i++) if (/map/.test(lazy[i]) && !/filter .* keep/.test(lazy[i - 1])) out.push('lazy: a map that did not follow a kept filter');
      need('sx-dyn', [g(D.traits, /size_of &Whitespace = (\d+)/) + ' bytes', 'is ' + g(D.traits, /&dyn Tokenizer = (\d+)/) + ' (recorded', g(D.bench.rs, /^generic closure F: Fn\s+([0-9.]+)/) + ' ns', g(D.bench.rs, /^&dyn Fn closure\s+([0-9.]+)/) + ' ns']);
      (D.mono.match(/^t mono::biggest::<[^>]+>$/mg) || []).forEach(s => need('sx-dyn', [s.replace('t mono::biggest::', '').replace('biggest', '')]));
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`)); }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || r[1] !== 'step 1 of ' + r[1].split(' of ')[1]) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(r)) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
