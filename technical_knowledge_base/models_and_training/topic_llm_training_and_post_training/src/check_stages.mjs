// The 2026-11-06 rollout checks for Topic: llm-training-and-post-training (2026-11-10), adapted from Topic: llm-landscape's check_stages.mjs.
// Fig. 1 (stg-life, the lifecycle) plays by itself once scrolled into view, steps to its last step with one step-list item per step,
// marks a clicked step and holds it, stops redrawing off screen and never moves under reduced motion; the compute shares its step list
// quotes equal the ones the scene computes (window.LIFE). Fig. 2 (data by year, RD.anim) and Fig. 3 (three algorithms, RD.anim with
// three step lists) play in view, have one list item per step, stop on a control, and a mode switch swaps the list and replays.
// Price list: "What a headline figure leaves out" plays in view and stops on a control; the zoom and the recipes' compute bars are
// widgets that never play by themselves. The three Reading splits are two columns at 1400 px and one below 1100 px; no errors, NaN,
// undefined or sideways scroll in any tab; no login name (looked up at run time, case-sensitive), hostname, IP address or local path
// in the root's own files. Screenshots of every Fig. 1 step (mid-glide and settled) at 1400 light and settled at 390 dark go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/src/check_stages.mjs [shots dir] [--fast]
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
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== 3 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: the three Reading splits are not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    const r = await p.evaluate(() => { const L = window.LIFE, t = document.getElementById('sx-life').innerText, miss = [];
      if (!L) return ['window.LIFE'];
      L.stages.forEach(d => { if (!(d.share > 0 && d.height >= 0)) miss.push(d.stage + ' has no share'); if (!t.includes(d.label)) miss.push(d.stage + ' ' + d.label) });
      if (L.stages.length !== 5) miss.push('5 stages, found ' + L.stages.length); return miss });
    if (r.length) problems.push(`${tag}: the step list does not match the scene: ${r.join(', ')}`);
  }
  // Fig. 1 plays once in view
  await p.$eval('#stg-life', e => e.scrollIntoView({ block: 'center' })); await wait(2400);
  if (!((await p.$eval('#stg-life', e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: stg-life did not play when scrolled into view`);
  // off screen: no redraws
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(800);
  const dr = () => p.$eval('#stg-life', x => +x.dataset.draws || 0); const d0 = await dr(); await wait(1200); const d1 = await dr();
  if (d1 !== d0) problems.push(`${tag}: stg-life redrew while off screen (${d0} -> ${d1})`);
  // step through every step
  await p.$eval('#stg-life-b', e => e.click());
  await p.evaluate(() => { const e = document.getElementById('stg-life-r'); e.value = 0; e.dispatchEvent(new Event('input')) });
  const n = await p.$eval('#stg-life-r', e => +e.max + 1), lis = await p.$eval('#sx-life', e => e.children.length);
  if (lis !== n) problems.push(`${tag}: stg-life has ${n} steps but its list shows ${lis}`);
  if (n > 8) problems.push(`${tag}: stg-life has ${n} steps, more than about 8`);
  await p.$eval('#stg-life', e => e.scrollIntoView({ block: 'center' }));
  for (let k = 0; k < n; k++) {
    if (k) await p.$eval('#stg-life-f', e => e.click());
    if (big) {
      if (width === 1400) { await wait(650); await (await p.$('#stg-life')).screenshot({ path: `${shots}/x-stg-life-s${k + 1}-midglide-${scheme}-${width}.png` }) }
      await wait(1900); await (await p.$('#stg-life')).screenshot({ path: `${shots}/x-stg-life-s${k + 1}-${scheme}-${width}.png` });
    } else await wait(250);
  }
  await wait(1600);
  const sh = await p.$eval('#stg-life .stg-st', e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: stg-life ended on ${sh}`);
  await audit('stg-life last step');
  await p.evaluate(() => document.getElementById('sx-life').children[2].click()); await wait(300);
  const cur = await p.$eval('#sx-life', e => [...e.children].findIndex(li => li.classList.contains('on')));
  if (cur !== 2) problems.push(`${tag}: a click on step 3 of sx-life marks ${cur + 1}`);
  await wait(5600); const still = await p.$eval('#stg-life .stg-st', e => e.textContent); if (still !== `step 3 of ${n}`) problems.push(`${tag}: stg-life moved on after a list click (${still})`);
  // the 2D animations: play in view, one list item per step, stop on a control
  const anim2d = async (card, ctl, list, name) => {
    await p.evaluate(() => scrollTo(0, 0)); await wait(150);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (!(await p.$eval(`#${ctl}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${name} did not play when scrolled into view`);
    const ln = await p.$eval('#' + list, e => e.children.length), sn = await p.$eval(`#${ctl}-s`, e => +e.max + 1); if (ln !== sn) problems.push(`${tag}: ${name} has ${sn} steps, its list ${ln}`);
    if (big) { await wait(900); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-autoplay-${scheme}-${width}.png` }) }
    await p.$eval(`#${ctl}-f`, e => e.click()); await wait(300); const i0 = await p.$eval(`#${ctl}-s`, e => +e.value); await wait(5600);
    if ((await p.$eval(`#${ctl}-s`, e => +e.value)) !== i0) problems.push(`${tag}: ${name} kept playing after a control`);
    for (let i = 0; i < sn; i++) { await p.$eval(`#${ctl}-s`, (s, i) => { s.value = i; s.dispatchEvent(new Event('input')) }, i); await audit(`${name} step ${i + 1}`) }
    const on = await p.$eval('#' + list, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== sn - 1) problems.push(`${tag}: ${name} list marks ${on + 1} at the last step`);
    return sn;
  };
  await anim2d('rd-dt', 'rd-dtC', 'sx-dt', 'Fig. 2');
  if (big) { await p.$eval('#rd-dtC-s', s => { s.value = 3; s.dispatchEvent(new Event('input')) }); await (await p.$('#rd-dt')).screenshot({ path: `${shots}/x-rd-dt-s4-${scheme}-${width}.png` }) }
  await anim2d('rd-rl', 'rd-rlC', 'sx-ppo', 'Fig. 3 PPO');
  for (const [m, n] of [['grpo', 6], ['dpo', 5]]) {
    await p.$eval(`#rd-rlM button[data-m=${m}]`, b => b.click()); await wait(1200);
    const vis = await p.$$eval('#t-read ol.sx[id^="sx-"]', xs => xs.filter(x => /^sx-(ppo|grpo|dpo)$/.test(x.id) && !x.hidden).map(x => x.id));
    if (vis.join() !== 'sx-' + m) problems.push(`${tag}: Fig. 3 mode ${m} shows lists ${vis}`);
    const sn = await p.$eval('#rd-rlC-s', e => +e.max + 1), ln = await p.$eval('#sx-' + m, e => e.children.length);
    if (sn !== n || ln !== n) problems.push(`${tag}: Fig. 3 mode ${m}: ${sn} steps, list ${ln}, expected ${n}`);
    if (!(await p.$eval('#rd-rlC-p', e => /Pause/.test(e.textContent)))) problems.push(`${tag}: Fig. 3 did not replay after switching to ${m}`);
    await p.$eval('#rd-rlC-s', s => { s.value = 3; s.dispatchEvent(new Event('input')) }); await audit('Fig. 3 ' + m);
    if (big) await (await p.$('#rd-rl')).screenshot({ path: `${shots}/x-rd-rl-${m}-s4-${scheme}-${width}.png` });
  }
  await p.$eval('#rd-rlM button[data-m=ppo]', b => b.click());
  // grid and chooser still work
  { const n = await p.$$eval('#rd-grid td button', a => { a.forEach(x => x.click()); return a.length }); if (n !== 32) problems.push(`${tag}: grid has ${n} cells`) }
  { const n = await p.$$eval('#rd-chF button', a => { a.forEach(x => x.click()); return a.length }); if (n !== 7) problems.push(`${tag}: chooser has ${n} paths`) }
  await audit('Reading');
  for (const t of ['t-recipes', 't-price', 't-scale', 't-more']) {
    await p.click(`#tabs button[data-t="${t}"]`); await wait(400);
    const h = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 700) { await p.evaluate(y => scrollTo(0, y), y); await wait(40) }
    if (t === 't-recipes') { await p.$eval('#rc-an-play', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
      if (await p.$eval('#rc-an-play', e => /Pause/.test(e.textContent))) problems.push(`${tag}: widget rc-an (compute bars) played by itself`) }
    if (t === 't-price') {
      await p.$eval('#pl-zplay', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (await p.$eval('#pl-zplay', e => /Pause/.test(e.textContent))) problems.push(`${tag}: widget pl-zoom played by itself`);
      await p.evaluate(() => scrollTo(0, 0)); await wait(200);
      await p.$eval('#pl-grow', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!(await p.$eval('#pl-gplay', e => /Pause/.test(e.textContent)))) problems.push(`${tag}: headline stepper did not play when scrolled into view`);
      await p.$eval('#pl-gnext', e => e.click()); const g0 = await p.$eval('#pl-gpos', e => e.textContent); await wait(5000);
      if ((await p.$eval('#pl-gpos', e => e.textContent)) !== g0) problems.push(`${tag}: headline stepper kept playing after a control`);
    }
    await audit(t, t);
  }
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
if (!FAST) { // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  await p.$eval('#stg-life', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const r = await p.$eval('#stg-life', e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: stg-life moved by itself (${r})`);
  const d0 = await p.$eval('#stg-life', x => +x.dataset.draws || 0); await wait(1200); const d1 = await p.$eval('#stg-life', x => +x.dataset.draws || 0);
  if (d1 !== d0) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  for (const [card, ctl] of [['rd-dt', 'rd-dtC'], ['rd-rl', 'rd-rlC']]) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1800);
    if (await p.$eval(`#${ctl}-p`, e => /Pause/.test(e.textContent))) problems.push(`reduced motion: ${card} played by itself`) }
  await p.click('#tabs button[data-t="t-price"]'); await wait(300); await p.$eval('#pl-grow', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
  if (await p.$eval('#pl-gplay', e => /Pause/.test(e.textContent))) problems.push('reduced motion: the headline stepper played by itself');
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
