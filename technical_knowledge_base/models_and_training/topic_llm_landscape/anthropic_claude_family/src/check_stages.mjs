// The 2026-11-06 rollout checks for Anthropic: Claude family (2026-11-10), adapted from Alibaba: Qwen's check_stages.mjs: the two 3D stages
// (Fig. 5 append-only plates, driven by window.AP; Fig. 6 one agent session turn by turn, driven by window.SS) play by themselves once scrolled
// into view, step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion; no errors,
// NaN, undefined or sideways scroll in any tab; the splits are two columns at 1400 px and one below 1100 px; the numbers the step lists write are
// what the page's own models give (and follow the model select of Fig. 6). Screenshots of every step (mid-tween and settled) at 1400 light, and of
// the middle step at 390 dark, go to the shots dir (outside the repo).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_landscape/anthropic_claude_family/src/check_stages.mjs <shots dir>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2];
if (!shots) { console.log('usage: check_stages.mjs <shots dir outside the repo>'); process.exit(2); }
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-ap', 'stg-ss'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, shoot = width === 1400 || width === 390;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const offs = () => p.$$eval('.stg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? (+x.dataset.draws || 0) + (+x.dataset.frames || 0) : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (n > 8) problems.push(`${tag}: ${id} has ${n} steps, more than about 8`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot && (width === 1400 || k === Math.floor(n / 2))) {
        await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const id of STAGES) await stepAll(id, 'sx-' + id.slice(4));
  if (width === 1400) { // the numbers the step lists write are what the page's data gives
    const r = await p.evaluate(() => { const out = [], n = v => v.toLocaleString('en-GB');
      const li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const ev = k => AP.evalA(k, 'error'), dr = k => AP.evalA(k, 'drop'), c4 = v => '$' + v.toFixed(4);
      need('sx-ap', 0, n(AP.B.reduce((s, b) => s + b.t, 0)) + ' tokens'); need('sx-ap', 1, n(ev('append').read) + '-token history'); need('sx-ap', 1, n(ev('append').write) + ' new tokens');
      need('sx-ap', 1, '$' + PBY('Opus 5.5').c.toFixed(2) + ' per million'); need('sx-ap', 1, c4(ev('append').cost));
      if (!ev('sys').rejected || ev('sys').inv !== 3) out.push('sys edit should reject with 3 invalid blocks');
      need('sx-ap', 2, n(ev('sys').read) + ' tokens of tools'); need('sx-ap', 2, 're-writes ' + n(dr('sys').write)); need('sx-ap', 2, c4(dr('sys').cost));
      need('sx-ap', 2, (dr('sys').cost / ev('append').cost > 3 && dr('sys').cost / ev('append').cost < 4) ? 'more than three times' : 'MISMATCH');
      need('sx-ap', 3, '(' + AP.A.midsys.add.t + ' tokens)'); need('sx-ap', 3, n(ev('midsys').read) + ' tokens'); need('sx-ap', 3, c4(ev('midsys').cost));
      if (ev('trim').inv !== 2) out.push('trim should invalidate two blocks'); need('sx-ap', 4, '(' + n(ev('trim').read) + ' tokens read)');
      if (ev('down').drop !== 3) out.push('down should drop three blocks'); need('sx-ap', 5, n(ev('down').write - AP.NEW.t) + ' tokens and the new ' + n(AP.NEW.t)); need('sx-ap', 5, c4(ev('down').cost));
      // Fig. 6 at its default model, then after the select moves to Haiku 4.5 (window 200K) and back
      const p = PBY('Opus 5.5'), N = SS.nums(p), t1 = SS.turn(1, 'cache', p), t2 = SS.turn(2, 'cache', p), t16 = SS.turn(16, 'cache', p);
      need('sx-ss', 0, n(SS.P) + '-token prefix'); need('sx-ss', 0, n(SS.N) + ' tokens of input'); need('sx-ss', 0, n(SS.O) + ' tokens of output'); if (t1.write !== SS.P + SS.N) out.push('turn 1 write');
      need('sx-ss', 1, n(t2.read) + ' tokens'); need('sx-ss', 1, '(' + n(t2.write) + ' tokens)');
      need('sx-ss', 2, 'adds ' + n(SS.N + SS.O) + ' tokens'); need('sx-ss', 2, 'holds ' + n(SS.ctx(16)) + ' tokens, ' + n(t16.read)); need('sx-ss', 3, 'hold ' + n(SS.ctx(15)) + ' tokens');
      if (SS.last(PBY('Haiku 4.5')) !== 14) out.push('Haiku 4.5 should fit 14 turns'); need('sx-ss', 3, 'past turn 14');
      need('sx-ss', 4, N.t1); need('sx-ss', 4, N.tl); need('sx-ss', 4, N.rd); need('sx-ss', 4, N.cum); need('sx-ss', 5, N.none); need('sx-ss', 5, N.x + ' times');
      const sel = document.getElementById('ssMod'); sel.value = 'Haiku 4.5'; sel.dispatchEvent(new Event('change'));
      const H = SS.nums(PBY('Haiku 4.5')); need('sx-ss', 4, 'turn ' + H.L + ' costs ' + H.tl); need('sx-ss', 4, 'the ' + H.L + ' turns cost ' + H.cum); need('sx-ss', 5, H.none);
      sel.value = 'Opus 5.5'; sel.dispatchEvent(new Event('change')); need('sx-ss', 4, 'turn 16 costs ' + N.tl);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-cost', 't-aa', 't-metr', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t); }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
