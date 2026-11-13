// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-hero: one pool of experience, three arms and their outcomes; #stg-ret: the retrieval pool) play by themselves once
// scrolled into view, step to their last step, have exactly one step-list item per step, stop for good on a reader control, and their flows
// stop drawing off screen; the numbers their step lists quote are recomputed from the page's own data (PAPER.tables, PAPER.rc);
// the paired-run replay (#rp, makeAnim, five steps per arm) plays by itself in view, replays on an arm switch, has a step list per arm,
// stops on the forward button and on a list click; at 1100 px and wider every split shows two columns; no errors, NaN, undefined or
// sideways scroll; under prefers-reduced-motion nothing moves by itself. Writes screenshots of each stage's steps and the replay mid-way.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/demystifying_agent_skills/src/check_stages.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = []; let checked = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
// 0. the step lists' numbers against the page's data
{
  const p = await b.newPage(); await p.goto(file);
  const r = await p.evaluate(() => {
    const T = PAPER.tables, RC = PAPER.rc, f1 = v => v.toFixed(1), miss = [];
    const has = (id, s) => { if (!document.getElementById(id).textContent.includes(s)) miss.push(id + ': ' + s) };
    // the hero: the bars the scene draws, and the paired differences
    HERO_MET.forEach(M => M.v.forEach(v => has('sx-hero', f1(v) + '%')));
    T.T9.forEach(x => has('sx-hero', x[0]));
    has('sx-hero', '+' + (100 * +T.T10[6]).toFixed(2)); has('sx-hero', '+' + (100 * +T.T10[3]).toFixed(2));
    ['SC2'].forEach(k => Object.values(RC.sc_counts).forEach(c => has('sx-hero', String(c[k]))));
    // retrieval: averages (printed to 0.1; recompute.py's means may differ by rounding), similar pools, per agent, the derived counts
    const near = (id, v) => { const t = document.getElementById(id).textContent; if (![v - .1, v - .05, v, v + .05, v + .1].some(x => t.includes(x.toFixed(1) + '%'))) miss.push(id + ': ~' + v.toFixed(2) + '%') };
    [RC.avg_arm1_p[0], RC.avg_arm1_p[4], RC.avg_arm2_p[0], RC.avg_arm2_p[4], RC.avg_arm3_p[0], RC.avg_arm3_p[4], RC.avg_arm3_succ[0], RC.avg_arm3_succ[4],
     RC.per_pair_arm3.codex.p5, RC.per_pair_arm3.codex.p100, RC.per_pair_arm3.gemini.p5, RC.per_pair_arm3.gemini.p100, RC.per_pair_arm3.codex.s5, RC.per_pair_arm3.codex.s100].forEach(v => near('sx-ret', v));
    ['random', 'similar', 'dissimilar'].forEach(pl => { has('sx-ret', T.T4[pl].arm1_p[0] + '%'); has('sx-ret', T.T4[pl].arm1_p[4]) });
    has('sx-ret', RET_TOUCHED.codex + ' drawn'); has('sx-ret', RET_TOUCHED.gemini + ' drawn');
    const it = RC.implied_skills_touched, k100 = ag => ['random', 'similar', 'dissimilar'].map(pl => it[ag][pl][4]);
    has('sx-ret', 'about ' + Math.floor(Math.min(...k100('codex'))) + ' to ' + Math.round(Math.max(...k100('codex'))));
    has('sx-ret', 'about ' + Math.round(Math.min(...k100('gemini'))) + ' to ' + Math.round(Math.max(...k100('gemini'))));
    return miss;
  });
  if (r.length) problems.push('step lists do not quote the data: ' + r.join(' | '));
  await p.close();
}
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  for (const t of await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t))) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300);
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: Math.abs(r.left - a.right) > 0 && (r.left >= a.right - 1 || r.right <= a.left + 1) && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    // 3D stages
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      const playing = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (!playing) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      if (width !== 920) { await wait(1500); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-1-${scheme}-${width}.png` }) }
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (width !== 920 || k === Math.floor(n / 2)) { await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${k + 1}-${scheme}-${width}.png` }) } }
      await wait(1700);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
    }
    // the paired-run replay (makeAnim), each arm
    if (t === 't-read') {
      const id = 'rp'; checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (!(fr > 0) || !pl) problems.push(`${tag}: ${id} did not play when scrolled into view (frames ${fr}, playing ${pl})`);
      for (const m of ['raw', 'wf', 'skill']) {
        await clk(`#${id}M button[data-m=${m}]`); await wait(1200);
        if (!(await p.$eval('#' + id, e => e.hasAttribute('data-playing')))) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const n = await p.$eval(`#${id}Scrub`, e => +e.max / 100);
        const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
        if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but ${lis} list items`);
        const vis = await p.$eval('#sx-rp-' + m, e => !e.hidden); if (!vis) problems.push(`${tag}: ${id} ${m} shows another arm's step list`);
        for (let k = 0; k < n; k++) { await clk(`#${id}Fwd`); if (k === Math.floor(n / 2) - 1 && width !== 920) await (await p.$('#' + id)).screenshot({ path: `${shots}/anim-${id}-${m}-mid-${scheme}-${width}.png` }) }
        if (await p.$eval('#' + id, e => e.hasAttribute('data-playing'))) problems.push(`${tag}: ${id} still playing after the forward button`);
        const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
        if (on !== n - 1) problems.push(`${tag}: ${id} ${m} list marks item ${on + 1} at the last step`);
        await p.evaluate(id => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[1].click(), id);
        const pl2 = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
        await p.waitForFunction(id => !document.getElementById(id).hasAttribute('data-playing'), { timeout: 15000 }, id).catch(() => problems.push(`${tag}: ${id} ${m} list click did not stop`));
        if (!pl2) problems.push(`${tag}: ${id} ${m} list click did not play its step`);
      }
    }
    const r = await p.evaluate(t => { const el = document.getElementById(t); const txt = el.innerText;
      return { bad: (txt.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth } }, t);
    if (r.bad.length) problems.push(`${tag} ${t}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) problems.push(`${tag}: error box: ${box}`);
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of ['stg-hero', 'rp', 'stg-ret']) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
    const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
    if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
