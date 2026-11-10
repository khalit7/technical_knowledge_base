// The 2026-11-06 rollout checks for Topic: llm-architecture (2026-11-10), adapted from The transformer from zero's check_stages.mjs.
// Fig. 1 (stg-map, the decoder in one screen) plays by itself once scrolled into view, steps to its last step with one step-list item per
// step (at most 8), marks a clicked step, stops redrawing off screen and never moves under reduced motion; the numbers its step list quotes
// equal the ones the scene computes from the Llama 3.1 8B config (window.LAM); the Architecture map's eras stepper plays in view and stops on
// a control; the four long replays (Block lab walk, Pythia checkpoints, window blocks, the map's timeline) are widgets that never play by
// themselves; the splits are two columns at 1400 px and one below 1100 px; no errors, NaN, undefined or sideways scroll in any tab; no login
// name (looked up at run time, case-sensitive), hostname, IP address or local path in the root's built page and its own source.
// Screenshots of every step (mid-tween and settled) at 1400 light, and of every step at 390 dark, go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_architecture/src/check_stages.mjs [shots dir] [--fast]
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
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const f = path.join(d, e.name); if (e.isDirectory()) { if (!/^(__pycache__|node_modules|out)$/.test(e.name)) walk(f) } else if (/\.(html|js|mjs|md|py|sh)$/.test(e.name)) files.push(f) });
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
  if (width === 1400 && (cols.length !== 2 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: the two Reading splits are not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  // the step list quotes the scene's own numbers
  if (width === 1400) {
    const r = await p.evaluate(() => { const L = window.LAM, t = document.getElementById('sx-map').innerText.replace(/×/g, 'x'), miss = [];
      [L.txt.emb, L.txt.attn, L.txt.ffn, L.txt.block, L.txt.total, L.txt.kvTok, L.txt.kvCtx, L.txt.share].forEach(v => { if (!t.includes(v)) miss.push(v) });
      return { miss, lam: L && L.txt } });
    if (r.miss.length) problems.push(`${tag}: the step list does not quote ${r.miss.join(', ')} (scene: ${JSON.stringify(r.lam)})`);
  }
  // Fig. 1 plays once in view
  await p.$eval('#stg-map', e => e.scrollIntoView({ block: 'center' })); await wait(2400);
  if (!((await p.$eval('#stg-map', e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: stg-map did not play when scrolled into view`);
  if (width === 1400 || width === 390) await (await p.$('#stg-map')).screenshot({ path: `${shots}/x-stg-map-autoplay-${scheme}-${width}.png` });
  // off screen: no redraws
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(800);
  const dr = () => p.$eval('#stg-map', x => +x.dataset.draws || 0); const d0 = await dr(); await wait(1200); const d1 = await dr();
  if (d1 !== d0) problems.push(`${tag}: stg-map redrew while off screen (${d0} -> ${d1})`);
  // step through every step
  await p.$eval('#stg-map-b', e => e.click());
  await p.evaluate(() => { const e = document.getElementById('stg-map-r'); e.value = 0; e.dispatchEvent(new Event('input')) });
  const n = await p.$eval('#stg-map-r', e => +e.max + 1), lis = await p.$eval('#sx-map', e => e.children.length);
  if (lis !== n) problems.push(`${tag}: stg-map has ${n} steps but its list shows ${lis}`);
  if (n > 8) problems.push(`${tag}: stg-map has ${n} steps, more than about 8`);
  await p.$eval('#stg-map', e => e.scrollIntoView({ block: 'center' }));
  for (let k = 0; k < n; k++) {
    if (k) await p.$eval('#stg-map-f', e => e.click());
    if (width === 1400 || width === 390) {
      if (width === 1400) { await wait(650); await (await p.$('#stg-map')).screenshot({ path: `${shots}/x-stg-map-s${k + 1}-midtween-${scheme}-${width}.png` }) }
      await wait(2300); await (await p.$('#stg-map')).screenshot({ path: `${shots}/x-stg-map-s${k + 1}-${scheme}-${width}.png` });
    } else await wait(250);
  }
  await wait(1800);
  const sh = await p.$eval('#stg-map .stg-st', e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: stg-map ended on ${sh}`);
  await audit('stg-map last step');
  await p.evaluate(() => document.getElementById('sx-map').children[2].click()); await wait(300);
  const cur = await p.$eval('#sx-map', e => [...e.children].findIndex(li => li.classList.contains('on')));
  if (cur !== 2) problems.push(`${tag}: a click on step 3 of sx-map marks ${cur + 1}`);
  await wait(5500); const still = await p.$eval('#stg-map .stg-st', e => e.textContent); if (still !== `step 3 of ${n}`) problems.push(`${tag}: stg-map moved on after a list click (${still})`);
  await audit('Reading end');
  // the other tabs: the eras stepper plays in view and stops on a control; the long replays never play by themselves
  for (const t of ['t-block', 't-calc', 't-inside', 't-map', 't-more']) {
    await p.click(`#tabs button[data-t="${t}"]`); await wait(400);
    const h = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 600) { await p.evaluate(y => scrollTo(0, y), y); await wait(50) }
    for (const w of ['bl-walk-ctl', 'in-phctl', 'in-wnctl', 'am-tl-ctl']) { const el = await p.$('#' + w); if (!el || !(await el.isVisible())) continue;
      await p.$eval('#' + w, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (await p.$eval('#' + w + '-p', e => /Pause/.test(e.textContent))) problems.push(`${tag}: widget ${w} played by itself`) }
    if (t === 't-map') {
      await p.$eval('#am-er-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!(await p.$eval('#am-er-ctl-p', e => /Pause/.test(e.textContent)))) problems.push(`${tag}: the eras stepper did not play when scrolled into view`);
      await p.$eval('#am-er-ctl-f', e => e.click()); await wait(300); const i0 = await p.$eval('#am-er-ctl-s', e => +e.value); await wait(5200);
      if ((await p.$eval('#am-er-ctl-s', e => +e.value)) !== i0) problems.push(`${tag}: the eras stepper kept playing after a control`);
    }
    await audit(t, t);
  }
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
if (!FAST) { // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  await p.$eval('#stg-map', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const r = await p.$eval('#stg-map', e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: stg-map moved by itself (${r})`);
  const d0 = await p.$eval('#stg-map', x => +x.dataset.draws || 0); await wait(1200); const d1 = await p.$eval('#stg-map', x => +x.dataset.draws || 0);
  if (d1 !== d0) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.click('#tabs button[data-t="t-map"]'); await wait(400); await p.$eval('#am-er-card', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
  if (await p.$eval('#am-er-ctl-p', e => /Pause/.test(e.textContent))) problems.push('reduced motion: the eras stepper played by itself');
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
