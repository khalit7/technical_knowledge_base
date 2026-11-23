// The 2026-11-06 layout and motion checks for the 2026-11-23 tech-news issue, at 1400 px light, 920 px light and 390 dark:
// - the 2D sampler-pool animation #v-pool (Research, beside the sampler item, RD.anim) plays once in view, has one list item per step in both
//   modes, shows exactly one list per mode, replays after a mode switch, reaches its last step and stays stopped after a control;
// - each step's temperature matches its stop (1, 1, 2, 2 in both modes);
// - every split (strip, cost chart, pool) is two columns at 1400 px; no errors, NaN, undefined or sideways scroll in any tab;
// - under prefers-reduced-motion nothing moves by itself.
// This issue has no 3D stage (see README). Writes mid-step screenshots of the animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/tech_news/2026_11_23_tech_news/src/check_stages.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
if (!process.argv[2]) { console.error('usage: check_stages.mjs <shots dir>'); process.exit(2) }
const shots = path.resolve(process.argv[2]); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const problems = []; let checked = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); // the AI buddy (loaded from html_utils, not part of this page) cannot fetch its search index over file://: ignore exactly that
  const buddyNoise = t => /kb_index\.json/.test(t) || /^Failed to load resource: net::ERR_FAILED$/.test(t);
  p.on('console', m => { if (m.type() === 'error' && !buddyNoise(m.text())) errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  let nsplit = 0;
  for (const t of await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t))) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300);
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    nsplit += splits.length;
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    if (await p.$(`#${t} #v-pool`)) {
      checked++;
      await p.$eval('#v-pool', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
      if (!await p.$eval('#plCtl-p', e => /Pause/.test(e.textContent))) problems.push(`${tag}: the pool animation is not playing after scrolling into view`);
      // off screen it pauses: the step does not move while scrolled away (to the foot of the tab: at the top it is still half in view on wide screens)
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await wait(300);
      if (await p.$eval("#v-pool", e => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight })) problems.push(`${tag}: could not scroll the pool animation off screen`);
      const s0 = await p.$eval('#plCtl-s', e => +e.value); await wait(5000); const s1 = await p.$eval('#plCtl-s', e => +e.value);
      if (s1 !== s0) problems.push(`${tag}: the pool animation moved off screen (${s0} to ${s1})`);
      await p.$eval('#v-pool', e => e.scrollIntoView({ block: 'center' })); await wait(300);
      for (const m of await p.$$eval('#plM button', bs => bs.map(b => b.dataset.m))) {
        await clk(`#plM button[data-m=${m}]`); await wait(1500);
        if (!await p.$eval('#plCtl-p', e => /Pause/.test(e.textContent))) problems.push(`${tag}: the pool animation did not replay after switching to ${m}`);
        const n = await p.$eval('#plCtl-s', e => +e.max + 1);
        const vis = await p.$$eval('ol[id^="sx-pl-"]', os => os.filter(o => !o.hidden).map(o => [o.id, o.children.length]));
        if (vis.length !== 1 || vis[0][0] !== 'sx-pl-' + m || vis[0][1] !== n) problems.push(`${tag}: pool ${m}: visible lists ${JSON.stringify(vis)} for ${n} steps`);
        await p.evaluate(() => { const e = document.getElementById('plCtl-s'); e.value = 0; e.dispatchEvent(new Event('input')) }); await wait(100);
        const f0 = await p.$eval('#v-pool', e => +e.dataset.frames || 0);
        for (let k = 0; k < n; k++) {
          if (k > 0) { await clk('#plCtl-f'); await wait(1300) }
          await wait(400);
          const exp = [1, 1, 2, 2][k];
          const u = await p.evaluate(() => { const v = document.querySelector('#plCnt .stat .v'); return v && +v.textContent });
          if (u !== exp) problems.push(`${tag}: pool ${m} step ${k + 1}: ${u} temperature shown, expected ${exp}`);
          if (k === Math.floor(n / 2)) await (await p.$('#sp-pool')).screenshot({ path: `${shots}/anim-pool-${m}-mid-${scheme}-${width}.png` });
        }
        const f1 = await p.$eval('#v-pool', e => +e.dataset.frames || 0); if (!(f1 > f0)) problems.push(`${tag}: pool ${m}: stepping forward drew no frames`);
        const on = await p.$eval('#sx-pl-' + m, l => [...l.children].findIndex(x => x.classList.contains('on')));
        if (on !== n - 1) problems.push(`${tag}: pool ${m}: list marks item ${on + 1} at the last step`);
        if (await p.$eval('#plCtl-p', e => /Pause/.test(e.textContent))) problems.push(`${tag}: pool ${m} still playing after a reader control`);
        await wait(4600); if (await p.$eval('#plCtl-s', e => +e.value) !== n - 1) problems.push(`${tag}: pool ${m} moved after a reader control`);
      }
      // a click on a list item jumps to that step and stops autoplay
      await clk('#plM button[data-m=topp]'); await wait(800); await clk('#sx-pl-topp li:nth-child(3)'); await wait(200);
      if (await p.$eval('#plCtl-s', e => +e.value) !== 2 || await p.$eval('#plCtl-p', e => /Pause/.test(e.textContent))) problems.push(`${tag}: a list click did not jump to step 3 and stop`);
    }
    const r = await p.evaluate(t => { const el = document.getElementById(t); const txt = el.innerText;
      return { bad: (txt.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth } }, t);
    if (r.bad.length) problems.push(`${tag} ${t}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${t}: sideways scroll`);
  }
  if (nsplit !== 3) problems.push(`${tag}: ${nsplit} splits, expected 3 (strip, cost chart, pool)`);
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) problems.push(`${tag}: error box: ${box}`);
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.$eval('#tabs button[data-t=t-research]', e => e.click()); await wait(300);
  await p.$eval('#v-pool', e => e.scrollIntoView({ block: 'center' })); await wait(5000);
  const f = await p.$eval('#v-pool', e => +e.dataset.frames || 0), pl = await p.$eval('#plCtl-p', e => /Pause/.test(e.textContent)), s = await p.$eval('#plCtl-s', e => +e.value);
  if (f > 0 || pl || s !== 0) problems.push(`reduced motion: the pool animation moved by itself (frames ${f}, step ${s})`);
  await p.$eval('#plM button[data-m=nsig]', e => e.click()); await wait(4500);
  if (await p.$eval('#plCtl-s', e => +e.value) !== 0 || await p.$eval('#v-pool', e => +e.dataset.frames || 0) > 0) problems.push('reduced motion: the pool animation moved after a mode switch');
  await p.close() }
await b.close();
console.log('animations and stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
