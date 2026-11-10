// The 2026-11-06 rollout checks for Topic: ml-fundamentals (2026-11-10), adapted from Topic: llm-training-and-post-training's check_stages.mjs.
// Fig. 1 (stg-step, one real training step) plays by itself once scrolled into view, steps to its last step with one step-list item per step,
// holds a clicked step, stops redrawing off screen and never moves under reduced motion; both recipes' step lists quote the numbers the scene
// computes (window.STEP1, from RDE); the recipe toggle swaps the list and replays. Fig. 2 (rd-vn, RD.anim) plays in view, has one list item
// per stretch and stops on a control. When training goes wrong: the bug-and-fix replay plays in view, has one list item per stretch in each
// case, stops on a control, and a case switch swaps the list and replays. The Training lab's run never starts by itself. The Reading splits
// are two columns at 1400 px and one below 1100 px; no errors, NaN, undefined or sideways scroll in any tab; no login name (looked up at run
// time, case-sensitive), hostname, IP address or local path in the root's own files. Screenshots of every Fig. 1 step (mid-glide and settled)
// at 1400 light and settled at 390 dark go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_ml_fundamentals/src/check_stages.mjs [shots dir] [--fast]
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
const SPLITS = 5; // Reading: top (Fig. 1), step 2 (Fig. 2), step 3 (Fig. 3), thread 1 (Fig. 4), thread 3 (Fig. 5)
// privacy: the root's own files only (its child pages are separate pages with their own checks)
{
  const user = os.userInfo().username, host = os.hostname(), files = [path.resolve(here, '../index.html'), path.resolve(here, '../README.md')];
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const f = path.join(d, e.name); if (e.isDirectory()) { if (!/^(__pycache__|node_modules|out)$/.test(e.name)) walk(f) } else if (/\.(html|js|mjs|md|py|sh|json)$/.test(e.name)) files.push(f) });
  walk(here);
  for (const f of files) { const s = fs.readFileSync(f, 'utf8'), rel = path.relative(path.resolve(here, '..'), f);
    if (user && s.includes(user)) problems.push(`privacy: login name in ${rel}`);
    if (host && host.length > 2 && new RegExp('\\b' + host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(s)) problems.push(`privacy: hostname in ${rel}`);
    const ip = s.match(/.{0,20}(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.]).{0,20}/);
    if (ip && !/arxiv|v\d|version|§/i.test(ip[0])) problems.push(`privacy? dotted quad in ${rel}: ${ip[0]}`);
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
  const tag = `${scheme} ${width}`, big = width === 1400 || width === 390;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(tab === 't-debug' ? /.{0,30}\b(undefined|Infinity)\b.{0,30}/g : /.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), /* the debug tab is about NaN losses: there only undefined and Infinity count */ side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: the ${SPLITS} Reading splits are not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // both recipes' lists quote the scene's numbers
    const r = await p.evaluate(() => { const S = window.STEP1, miss = []; if (!S) return ['window.STEP1'];
      for (const rec of ['modern', 'classic']) { const t = document.getElementById('sx-st-' + rec).textContent; S[rec].forEach(q => { if (!t.includes(q)) miss.push(rec + ': ' + q) }) } return miss });
    if (r.length) problems.push(`${tag}: Fig. 1's step lists do not quote the scene: ${r.join(', ')}`);
  }
  // Fig. 1 plays once in view
  await p.$eval('#stg-step', e => e.scrollIntoView({ block: 'center' })); await wait(2400);
  if (!((await p.$eval('#stg-step', e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: stg-step did not play when scrolled into view`);
  // off screen: no redraws
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(800);
  const dr = () => p.$eval('#stg-step', x => +x.dataset.draws || 0); const d0 = await dr(); await wait(1200); const d1 = await dr();
  if (d1 !== d0) problems.push(`${tag}: stg-step redrew while off screen (${d0} -> ${d1})`);
  // step through every step of both recipes
  for (const rec of ['modern', 'classic']) {
    await p.$eval(`#rd-stR button[data-r=${rec}]`, b => b.click()); await wait(300);
    const vis = await p.$$eval('#t-read ol.sx[id^="sx-st-"]', xs => xs.filter(x => !x.hidden).map(x => x.id));
    if (vis.join() !== 'sx-st-' + rec) problems.push(`${tag}: recipe ${rec} shows lists ${vis}`);
    await p.$eval('#stg-step', e => e.scrollIntoView({ block: 'center' })); await wait(1200);
    if (rec === 'classic' && !(await p.$eval('#stg-step-p', e => /Pause/.test(e.textContent)))) problems.push(`${tag}: stg-step did not replay after switching recipe`);
    await p.$eval('#stg-step-b', e => e.click());
    await p.evaluate(() => { const e = document.getElementById('stg-step-r'); e.value = 0; e.dispatchEvent(new Event('input')) });
    const n = await p.$eval('#stg-step-r', e => +e.max + 1), lis = await p.$eval('#sx-st-' + rec, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: stg-step has ${n} steps but its ${rec} list shows ${lis}`);
    if (n > 8) problems.push(`${tag}: stg-step has ${n} steps, more than about 8`);
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval('#stg-step-f', e => e.click());
      if (big && (rec === 'modern' || width === 1400)) {
        if (width === 1400) { await wait(650); await (await p.$('#stg-step')).screenshot({ path: `${shots}/x-stg-step-${rec}-s${k + 1}-midglide-${scheme}-${width}.png` }) }
        await wait(1900); await (await p.$('#stg-step')).screenshot({ path: `${shots}/x-stg-step-${rec}-s${k + 1}-${scheme}-${width}.png` });
      } else await wait(250);
      await audit(`stg-step ${rec} step ${k + 1}`);
    }
    await wait(1600);
    const sh = await p.$eval('#stg-step .stg-st', e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: stg-step ended on ${sh}`);
  }
  await p.evaluate(() => document.getElementById('sx-st-classic').children[2].click()); await wait(300);
  const cur = await p.$eval('#sx-st-classic', e => [...e.children].findIndex(li => li.classList.contains('on')));
  if (cur !== 2) problems.push(`${tag}: a click on step 3 of sx-st-classic marks ${cur + 1}`);
  await wait(6400); const still = await p.$eval('#stg-step .stg-st', e => e.textContent); if (!/^step 3 of/.test(still)) problems.push(`${tag}: stg-step moved on after a list click (${still})`);
  await p.$eval('#rd-stR button[data-r=modern]', b => b.click()); await wait(200);
  // the 2D animations: play in view, one list item per step, stop on a control
  const anim2d = async (card, ctl, list, name) => {
    await p.evaluate(() => scrollTo(0, 0)); await wait(150);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (!(await p.$eval(`#${ctl}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${name} did not play when scrolled into view`);
    const ln = await p.$eval('#' + list, e => e.children.length), sn = await p.$eval(`#${ctl}-s`, e => +e.max + 1); if (ln !== sn) problems.push(`${tag}: ${name} has ${sn} steps, its list ${ln}`);
    if (big) { await wait(2600); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-autoplay-${scheme}-${width}.png` }) }
    await p.$eval(`#${ctl}-f`, e => e.click()); await wait(300); const i0 = await p.$eval(`#${ctl}-s`, e => +e.value); await wait(5600);
    if ((await p.$eval(`#${ctl}-s`, e => +e.value)) !== i0) problems.push(`${tag}: ${name} kept playing after a control`);
    for (let i = 0; i < sn; i++) { await p.$eval(`#${ctl}-s`, (s, i) => { s.value = i; s.dispatchEvent(new Event('input')) }, i); await audit(`${name} step ${i + 1}`) }
    const on = await p.$eval('#' + list, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== sn - 1) problems.push(`${tag}: ${name} list marks ${on + 1} at the last step`);
    return sn;
  };
  await anim2d('rd-vn', 'rd-vnC', 'sx-vn', 'Fig. 2');
  await audit('Reading');
  for (const t of ['t-lab', 't-defaults', 't-debug', 't-more']) {
    await p.click(`#tabs button[data-t="${t}"]`); await wait(400);
    const h = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 700) { await p.evaluate(y => scrollTo(0, y), y); await wait(40) }
    if (t === 't-lab') { const pl = await p.$eval('#lb-play', e => e.getAttribute('aria-pressed')); if (pl === 'true') problems.push(`${tag}: the Training lab's run started by itself`) }
    if (t === 't-debug') {
      const cnt = await p.$$eval('#t-debug .s3sp', xs => xs.map(x => getComputedStyle(x).display));
      if (width === 1400 && cols.length && cnt.join() !== 'grid') problems.push(`${tag}: the debug split is not two columns (${cnt})`);
      await p.evaluate(() => scrollTo(0, 0)); await wait(150);
      await p.$eval('#dg-anim', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!(await p.$eval('#dg-aplay', e => /Pause/.test(e.textContent)))) problems.push(`${tag}: the bug-and-fix replay did not play when scrolled into view`);
      if (big) await (await p.$('#dg-anim')).screenshot({ path: `${shots}/x-dg-anim-autoplay-${scheme}-${width}.png` });
      await p.$eval('#dg-afwd', e => e.click()); const k0 = await p.$eval('#dg-ascrub', e => +e.value); await wait(2000);
      if ((await p.$eval('#dg-ascrub', e => +e.value)) !== k0) problems.push(`${tag}: the bug-and-fix replay kept playing after a control`);
      for (const m of ['exp', 'spk', 'van']) {
        await p.$eval(`#dg-am button[data-m=${m}]`, b => b.click()); await wait(900);
        const vis = await p.$$eval('#t-debug ol.sx', xs => xs.filter(x => !x.hidden).map(x => x.id));
        if (vis.join() !== 'sx-dg-' + m) problems.push(`${tag}: debug case ${m} shows lists ${vis}`);
        if (!(await p.$eval('#dg-aplay', e => /Pause/.test(e.textContent)))) problems.push(`${tag}: the replay did not replay after switching to ${m}`);
        const n = await p.$eval('#sx-dg-' + m, e => e.children.length); if (n !== 4) problems.push(`${tag}: debug list ${m} has ${n} items`);
        for (let j = 0; j < n; j++) { await p.evaluate((m, j) => document.getElementById('sx-dg-' + m).children[j].click(), m, j); await wait(120);
          const on = await p.$eval('#sx-dg-' + m, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== j) problems.push(`${tag}: debug ${m} item ${j + 1} click marks ${on + 1}`); await audit(`debug ${m} ${j + 1}`, 't-debug') }
        const last = await p.$eval('#dg-ascrub', e => +e.max); await p.$eval('#dg-ascrub', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, last); await wait(100);
        const on = await p.$eval('#sx-dg-' + m, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== 3) problems.push(`${tag}: debug ${m} last frame marks item ${on + 1}`);
      }
    }
    await audit(t, t);
  }
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
if (!FAST) { // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  await p.$eval('#stg-step', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const r = await p.$eval('#stg-step', e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: stg-step moved by itself (${r})`);
  const d0 = await p.$eval('#stg-step', x => +x.dataset.draws || 0); await wait(1200); const d1 = await p.$eval('#stg-step', x => +x.dataset.draws || 0);
  if (d1 !== d0) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.$eval('#rd-vn', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
  if (await p.$eval('#rd-vnC-p', e => /Pause/.test(e.textContent))) problems.push('reduced motion: rd-vn played by itself');
  await p.click('#tabs button[data-t="t-debug"]'); await wait(300); await p.$eval('#dg-anim', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
  if (await p.$eval('#dg-aplay', e => /Pause/.test(e.textContent))) problems.push('reduced motion: the bug-and-fix replay played by itself');
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
