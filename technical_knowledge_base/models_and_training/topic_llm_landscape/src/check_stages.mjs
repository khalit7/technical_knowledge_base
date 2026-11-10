// The 2026-11-06 rollout checks for Topic: llm-landscape (2026-11-10), adapted from Topic: llm-architecture's check_stages.mjs.
// Fig. 1 (stg-land, the labs on the three axes) plays by itself once scrolled into view, steps to its last step with one step-list item per
// step (at most 8), marks a clicked step, stops redrawing off screen and never moves under reduced motion; the prices its step list quotes
// equal the ones the scene reads from the page's data (window.LMAP); Fig. 2 (the four thinking designs, RD.anim) plays in view and stops on
// a control; the two long replays (the skeleton quarters in Reading section 5, the size time-lapse in Release history) are widgets that never
// play by themselves; the eight Reading splits are two columns at 1400 px and one below 1100 px; no errors, NaN, undefined or sideways scroll
// in any tab; no login name (looked up at run time, case-sensitive), hostname, IP address or local path in the root's built page and its own source.
// Screenshots of every step (mid-tween and settled) at 1400 light, and of every step at 390 dark, go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_landscape/src/check_stages.mjs [shots dir] [--fast]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const args = process.argv.slice(2), FAST = args.includes('--fast');
const file = 'file://' + path.resolve(here, '../index.html'), shots = args.find(a => !a.startsWith('--')) || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
// privacy: the root's own files only (its child pages are separate pages with their own checks)
{
  const user = os.userInfo().username, host = os.hostname(), files = [path.resolve(here, '../index.html'), path.resolve(here, '../README.md')];
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const f = path.join(d, e.name); if (e.isDirectory()) { if (!/^(__pycache__|node_modules|out|retired)$/.test(e.name)) walk(f) } else if (/\.(html|js|mjs|md|py|sh)$/.test(e.name)) files.push(f) });
  walk(here);
  for (const f of files) { const s = fs.readFileSync(f, 'utf8'), rel = path.relative(path.resolve(here, '..'), f);
    if (user && s.includes(user)) problems.push(`privacy: login name in ${rel}`);
    if (host && host.length > 2 && new RegExp('\\b' + host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(s)) problems.push(`privacy: hostname in ${rel}`);
    if (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(s.replace(/\b\d+\.\d+\.\d+\.\d+(?=\s*(?:%|x|B|M))/g, ''))) { const m = s.match(/.{0,20}\b(?:\d{1,3}\.){3}\d{1,3}\b.{0,20}/); problems.push(`privacy? dotted quad in ${rel}: ${m && m[0]}`) }
    if (/(?:\/home\/|\/Users\/|\/tmp\/claude)/.test(s)) problems.push(`privacy: local path in ${rel}`);
  }
}
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
for (const [scheme, width] of (FAST ? [['light', 1400]] : [['light', 1400], ['light', 920], ['dark', 390]])) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== 8 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: the eight Reading splits are not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  // the step list quotes the prices the scene reads from the page's data
  if (width === 1400) {
    const r = await p.evaluate(() => { const L = window.LMAP, t = document.getElementById('sx-land').innerText, miss = [];
      if (!L) return { miss: ['window.LMAP'] };
      L.labs.forEach(d => { if (d.price != null && !(d.price > 0)) miss.push(d.model + ' has no price'); if (d.price != null && !t.includes(d.txt)) miss.push(d.model + ' ' + d.txt) });
      if (L.labs.length !== 16) miss.push('16 markers, found ' + L.labs.length);
      return { miss } });
    if (r.miss.length) problems.push(`${tag}: the step list does not match the scene: ${r.miss.join(', ')}`);
  }
  // Fig. 1 plays once in view
  await p.$eval('#stg-land', e => e.scrollIntoView({ block: 'center' })); await wait(2400);
  if (!((await p.$eval('#stg-land', e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: stg-land did not play when scrolled into view`);
  if (width === 1400 || width === 390) await (await p.$('#stg-land')).screenshot({ path: `${shots}/x-stg-land-autoplay-${scheme}-${width}.png` });
  // off screen: no redraws
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(800);
  const dr = () => p.$eval('#stg-land', x => +x.dataset.draws || 0); const d0 = await dr(); await wait(1200); const d1 = await dr();
  if (d1 !== d0) problems.push(`${tag}: stg-land redrew while off screen (${d0} -> ${d1})`);
  // step through every step
  await p.$eval('#stg-land-b', e => e.click());
  await p.evaluate(() => { const e = document.getElementById('stg-land-r'); e.value = 0; e.dispatchEvent(new Event('input')) });
  const n = await p.$eval('#stg-land-r', e => +e.max + 1), lis = await p.$eval('#sx-land', e => e.children.length);
  if (lis !== n) problems.push(`${tag}: stg-land has ${n} steps but its list shows ${lis}`);
  if (n > 8) problems.push(`${tag}: stg-land has ${n} steps, more than about 8`);
  await p.$eval('#stg-land', e => e.scrollIntoView({ block: 'center' }));
  for (let k = 0; k < n; k++) {
    if (k) await p.$eval('#stg-land-f', e => e.click());
    if (width === 1400 || width === 390) {
      if (width === 1400) { await wait(650); await (await p.$('#stg-land')).screenshot({ path: `${shots}/x-stg-land-s${k + 1}-midtween-${scheme}-${width}.png` }) }
      await wait(2300); await (await p.$('#stg-land')).screenshot({ path: `${shots}/x-stg-land-s${k + 1}-${scheme}-${width}.png` });
    } else await wait(250);
  }
  await wait(1800);
  const sh = await p.$eval('#stg-land .stg-st', e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: stg-land ended on ${sh}`);
  await audit('stg-land last step');
  await p.evaluate(() => document.getElementById('sx-land').children[2].click()); await wait(300);
  const cur = await p.$eval('#sx-land', e => [...e.children].findIndex(li => li.classList.contains('on')));
  if (cur !== 2) problems.push(`${tag}: a click on step 3 of sx-land marks ${cur + 1}`);
  await wait(5500); const still = await p.$eval('#stg-land .stg-st', e => e.textContent); if (still !== `step 3 of ${n}`) problems.push(`${tag}: stg-land moved on after a list click (${still})`);
  await audit('Reading end');
  // Fig. 2, the four thinking designs: plays in view, stops on a control
  await p.evaluate(() => scrollTo(0, 0)); await wait(200);
  await p.$eval('#thCard', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if (!(await p.$eval('#thCtl-p', e => /Pause/.test(e.textContent)))) problems.push(`${tag}: Fig. 2 did not play when scrolled into view`);
  { const lis = await p.$eval('#sx-th', e => e.children.length), n = await p.$eval('#thCtl-s', e => +e.max + 1); if (lis !== n) problems.push(`${tag}: Fig. 2 has ${n} steps, its list ${lis}`) }
  await p.$eval('#thCtl-f', e => e.click()); await wait(300); { const i0 = await p.$eval('#thCtl-s', e => +e.value); await wait(6000);
    if ((await p.$eval('#thCtl-s', e => +e.value)) !== i0) problems.push(`${tag}: Fig. 2 kept playing after a control`) }
  if (width === 1400 || width === 390) await (await p.$('#thCard')).screenshot({ path: `${shots}/x-fig2-${scheme}-${width}.png` });
  for (const id of ['scCard', 'hhCard', 'pcBars']) { const el = await p.$('#' + id); if (el && (width === 1400 || width === 390)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300); await el.screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) } }
  // the skeleton quarters (Reading section 5) are a widget
  await p.$eval('#hhCard', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
  if (await p.$eval('#hhPlay', e => /Pause/.test(e.textContent))) problems.push(`${tag}: widget hhCard played by itself`);
  await audit('Reading');
  for (const t of ['t-bench', 't-iq', 't-time', 't-more']) {
    await p.click(`#tabs button[data-t="${t}"]`); await wait(400);
    const h = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 600) { await p.evaluate(y => scrollTo(0, y), y); await wait(50) }
    if (t === 't-time') { const el = await p.$('#spPlay'); if (el) { await p.$eval('#spPlay', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
      if (await p.$eval('#spPlay', e => /Pause/.test(e.textContent))) problems.push(`${tag}: widget spPlay (size time-lapse) played by itself`) } }
    await audit(t, t);
  }
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
if (!FAST) { // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  await p.$eval('#stg-land', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const r = await p.$eval('#stg-land', e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: stg-land moved by itself (${r})`);
  const d0 = await p.$eval('#stg-land', x => +x.dataset.draws || 0); await wait(1200); const d1 = await p.$eval('#stg-land', x => +x.dataset.draws || 0);
  if (d1 !== d0) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.$eval('#thCard', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
  if (await p.$eval('#thCtl-p', e => /Pause/.test(e.textContent))) problems.push('reduced motion: Fig. 2 played by itself');
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
