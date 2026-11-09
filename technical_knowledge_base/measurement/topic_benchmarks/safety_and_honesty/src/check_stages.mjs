// The 2026-11-06 rollout checks for Safety and honesty benchmarks: every 3D stage (Fig. 1 XSTest fields, Fig. 2 three graders, Fig. 3 AgentHarm) plays by itself
// once scrolled into view, steps to its last step in every mode with one step-list item per step, stops redrawing off screen and never moves under reduced motion;
// no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px. The numbers written in the step lists are checked
// against what the scenes compute from the page's data (window.SHN, from window.XS and window.SHD).
// usage (from the repo root): node technical_knowledge_base/measurement/topic_benchmarks/safety_and_honesty/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-xs', [['llama2orig', 'sx-xs-llama2orig'], ['mistralinstruct', 'sx-xs-mistralinstruct'], ['gpt4', 'sx-xs-gpt4']], '#xa-mode'], ['stg-gr', [['llama2orig', 'sx-gr-llama2orig'], ['mistralinstruct', 'sx-gr-mistralinstruct']], '#gr-mode'], ['stg-ag', [['', 'sx-ag']], null]];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (width === 1400 || width === 390) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-tween-${scheme}-${width}.png` }) }
  }
  // flows stop off screen
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-third').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const [id, modes, sel] of STAGES) for (const [m, lid] of modes) {
    if (sel) { await p.$eval(`${sel} [data-m="${m}"]`, e => e.click()); await wait(150); }
    const hid = await p.evaluate(lid => [...document.querySelectorAll('ol.sx')].filter(o => o.id.startsWith(lid.replace(/-[^-]+$/, '-')) && o.id !== lid && !o.hidden).length, lid);
    if (sel && hid) problems.push(`${tag}: ${id} ${m}: another mode's list is still shown`);
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (width === 1400 || width === 390) {
        if (k === Math.floor(n / 2)) { await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${m ? '-' + m : ''}-s${k + 1}-midtween-${scheme}-${width}.png` }) }
        await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${m ? '-' + m : ''}-s${k + 1}${k === Math.floor(n / 2) ? '-mid' : ''}-${scheme}-${width}.png` })
      }
    }
    await wait(1700);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m} ended on ${sh}`);
    await audit(`${id} ${m} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} ${m} list does not mark the last step`);
  }
  if (width === 1400) { // the step lists' numbers are the page's data (window.SHN, computed by the scenes from window.XS and window.SHD)
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const f1 = v => v.toFixed(1) + '%';
      for (const m of ['llama2orig', 'mistralinstruct', 'gpt4']) { const c = SHN.xs[m], id = 'sx-xs-' + m, w = c.worst;
        need(id, [[1, c.sf + ' fully and ' + c.sp + ' partially: ' + (c.sf + c.sp) + ' of 250 (' + f1(c.rs) + ')'], [2, c.uf + ' fully and ' + c.up + ' partially: ' + (c.uf + c.up) + ' of 200 (' + f1(c.ru) + ')'],
          [3, w.full + ' of ' + w.n], [3, w.part + ' partially'], [4, f1(c.rs)], [4, f1(c.ru)]]);
        const nm = { llama2orig: 'safe contexts', mistralinstruct: 'contrasts of definitions', gpt4: 'privacy' }[m];
        if (!li(id, 3).includes(nm) || w.name.toLowerCase() !== nm.replace('contrasts of ', '')) out.push(`${id}: worst row is ${w.name} (${w.side})`) }
      for (const m of ['llama2orig', 'mistralinstruct']) { const g = SHN.gr[m], id = 'sx-gr-' + m;
        [[1, 0], [2, 1], [3, 2]].forEach(([k, j]) => need(id, [[k, g.cnt[j].s + (k === 1 ? ' of 250' : '') ], [k, f1(g.rates[j][0])], [k, f1(g.rates[j][1])]]));
        need(id, [[4, g.dis[0].n + ' of 450'], [5, g.dis[1].n + ' of 450'], [5, g.dis[1].s + ' safe, ' + g.dis[1].u + ' unsafe']]) }
      need('sx-gr-llama2orig', [[1, '196 of 200'], [2, '14 of them partial'], [3, '55 of them partial'], [4, '44 are answers to safe prompts']]);
      need('sx-gr-mistralinstruct', [[1, '15 of 200'], [2, '11 of the answers'], [3, '27 of them partial'], [4, '59 are answers to unsafe prompts']]);
      const g0 = SHN.gr.llama2orig.cnt, g1 = SHN.gr.mistralinstruct.cnt;
      if (g0[1].p !== 14 || g0[2].p !== 55 || g1[1].z !== 11 || g1[2].p !== 27) out.push('grader partial or unlabelled counts ' + JSON.stringify([g0, g1]));
      // AgentHarm: the scene's data equals the closed table, and the step list quotes it
      const rows = [...document.querySelector('#rd-agent table tbody').rows].map(r => [...r.cells].map(c => c.textContent));
      SHN.ag.forEach((a, i) => { const t = rows[i]; if (t[0] !== a[0] || [1, 2, 3, 4].some(j => parseFloat(t[j]) !== a[j === 1 ? 1 : j === 2 ? 2 : j])) out.push('AgentHarm row ' + i + ' ' + t + ' vs ' + a);
        need('sx-ag', [[2, a[2].toFixed(1) + '%'], [2, a[1].toFixed(1) + '%'], [3, a[4].toFixed(1) + '%'], [3, a[3].toFixed(1) + '%']]);
        if (a[5] != null) need('sx-ag', [[4, a[5].toFixed(1) + '% against ' + a[6] + '%']]) });
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
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
