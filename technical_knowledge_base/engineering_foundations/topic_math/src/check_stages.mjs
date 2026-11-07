// The 2026-11-06 rollout checks (Topic: math): the hero stage (Fig. 1) and the Notation decoder's attention animation play by themselves once
// scrolled into view, step to their last step, have one step-list item per step and never move under reduced motion; flows stop off screen;
// the Gradient lab's two replays (backprop tape, optimiser path) are widgets that never play by themselves and open on their last frame;
// splits are two columns at 1400 px; no errors, NaN, undefined or sideways scroll.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_math/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
const tab = async (p, t) => { await p.click(`#tabs button[data-t="${t}"]`); await wait(400) };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async (where, t) => {
    // the Reading and the Gradient lab teach NaN (the overflow panel shows one on purpose), so there only undefined and Infinity count
    const r = await p.evaluate(t => ({ bad: (document.getElementById(t).innerText.match(t === 't-notation' ? /.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g : /.{0,30}\b(undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }), t);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const splits = async t => { const c = await p.$$eval(`#${t} .s3sp`, xs => xs.filter(x => x.offsetParent !== null).map(x => getComputedStyle(x).display)); if (!c.length || c.some(d => d !== 'grid')) problems.push(`${tag}: ${t} splits not two columns (${c})`) };
  if (width === 1400) await splits('t-read');
  // the hero stage: autoplay on view
  await p.$eval('#stg-one', e => e.scrollIntoView({ block: 'center' })); await wait(2400);
  if (!((await p.$eval('#stg-one', e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: stg-one did not play when scrolled into view`);
  // flows stop off screen
  await p.$eval('#rd-kids', e => e.scrollIntoView({ block: 'start' })); await wait(800);
  const d0 = await p.$eval('#stg-one', x => +x.dataset.draws || 0); await wait(1200);
  const d1 = await p.$eval('#stg-one', x => +x.dataset.draws || 0);
  if (d1 !== d0) problems.push(`${tag}: stg-one redrew while off screen (${d0} -> ${d1})`);
  // step to the last step; list length; screenshot mid-way
  {
    const id = 'stg-one';
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
    const lis = await p.$eval('#sx-one', l => l.children.length);
    if (lis !== n || n !== 9) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(60);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) }
    }
    await wait(2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    const on = await p.$eval('#sx-one', l => [...l.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} list marks ${on}`);
    await audit(`${id} last step`, 't-read');
    for (let k = 0; k < n; k++) await p.evaluate(k => document.getElementById('sx-one').children[k].click(), k);
  }
  // Notation decoder: the attention animation (7 stretches), autoplay, both modes, list length, last step
  await tab(p, 't-notation');
  await p.evaluate(() => document.querySelector('#nd-pick button[data-eq="attn"]').click()); await wait(200);
  if (width === 1400) await splits('t-notation');
  await p.$eval('#nd-an', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if (!/Pause/.test(await p.$eval('#nd-an-ctl-p', e => e.textContent))) problems.push(`${tag}: attention animation did not play when scrolled into view`);
  for (const m of ['u', 's']) {
    await p.$eval(`#nd-an-mode button[data-m="${m}"]`, e => e.click()); await wait(100);
    await p.$eval('#nd-an-ctl-b', e => e.click());
    const n = await p.$eval('#nd-an-ctl-s', e => +e.max + 1), lis = await p.$eval(`#sx-nd-${m}`, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: attention ${m} has ${n} steps but ${lis} visible items`);
    await p.evaluate(() => { const e = document.getElementById('nd-an-ctl-s'); e.value = 0; e.dispatchEvent(new Event('input')) });
    for (let k = 1; k < n; k++) { await p.$eval('#nd-an-ctl-f', e => e.click()); await wait(50);
      if (k === 4 && m === 's') { await wait(2600); await (await p.$('#nd-an')).screenshot({ path: `${shots}/x-nd-an-${scheme}-${width}.png` }) } }
    const on = await p.$eval(`#sx-nd-${m}`, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: attention ${m} list marks ${on}`);
  }
  await audit('notation', 't-notation');
  // Gradient lab: both replays are widgets, opening on their last frame
  await tab(p, 't-grad');
  if (width === 1400) await splits('t-grad');
  for (const [card, ctl] of [['gl-bpCard', 'gl-bpCtl'], ['gl-curvCard', 'gl-curvAnim']]) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.evaluate(c => { const s = document.getElementById(c + '-s'); return [document.getElementById(c + '-p').textContent, +s.value, +s.max] }, ctl);
    if (/Pause/.test(r[0])) problems.push(`${tag}: ${card} played by itself`);
    if (r[1] !== r[2]) problems.push(`${tag}: ${card} opened on frame ${r[1]} of ${r[2]}`);
    if (width === 1400) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${scheme}-${width}.png` });
  }
  await audit('grad', 't-grad');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(300);
  await p.$eval('#stg-one', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const r = await p.$eval('#stg-one', e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !r[1].startsWith('step 1 of')) problems.push(`reduced motion: stg-one moved by itself (${r})`);
  await tab(p, 't-notation'); await p.evaluate(() => document.querySelector('#nd-pick button[data-eq="attn"]').click());
  await p.$eval('#nd-an', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if (/Pause/.test(await p.$eval('#nd-an-ctl-p', e => e.textContent))) problems.push('reduced motion: attention animation moved by itself');
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
