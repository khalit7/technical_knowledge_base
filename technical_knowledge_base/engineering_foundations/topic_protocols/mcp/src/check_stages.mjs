// The 2026-11-06 rollout checks for the MCP page: every 3D stage plays by itself once scrolled into view, steps to its last step in every mode
// with one step-list item per step, stops redrawing off screen and never moves under reduced motion; no errors, NaN, undefined or sideways
// scroll; the splits are two columns at 1400 px and one below 1100 px. The recorded values written into the step lists are checked against
// the page's own data (window.MCPD and what the scenes derive from it: MCP_HERO, MCP_LIFE, MCP_TP, MCP_REP, MCP_AUTH).
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_protocols/mcp/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// stage id, its mode buttons (selector prefix) and modes, the step-list id for each mode
const STAGES = [['stg-hero', null, [null], () => 'sx-hero'], ['stg-life', '#life-mode', ['legacy', 'modern'], m => 'sx-life-' + m], ['stg-tp', null, [null], () => 'sx-tp'],
  ['stg-rep', '#rep-mode', ['0', '1', '2', '3'], m => 'sx-rep-' + m], ['stg-auth', null, [null], () => 'sx-auth']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
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
  // autoplay on view: data-frames rises
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-s9').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every mode of every stage to its last step; list length; screenshots mid-way and at the end
  for (const [id, sel, modes, lidOf] of STAGES) for (const m of modes) {
    if (sel) { await p.$eval(`${sel} [data-m="${m}"]`, e => e.click()); await wait(100); }
    const lid = lidOf(m), sfx = m == null ? '' : '-' + m;
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id}${sfx} has ${n} steps but list ${lid} shows ${lis}`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-mid-${scheme}-${width}.png` }) }
    }
    await wait(2600);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${sfx} ended on ${sh}`);
    if (width === 1400 || width === 390) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-last-${scheme}-${width}.png` }) }
    await audit(`${id}${sfx} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
  }
  if (width === 1400) { // the step lists' recorded values are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const f = n => n.toLocaleString('en-US');
      need('sx-hero', [[1, f(MCP_HERO.listB) + ' bytes']]);
      const L = MCP_LIFE.LEG, M = MCP_LIFE.MOD;
      need('sx-life-legacy', [[0, L[0].n + ' bytes'], [1, L[1].n + ' bytes'], [2, L[2].n + ' bytes'], [3, L[3].n + ' bytes'], [3, L[4].n + ' bytes'], [4, L[5].n + ' bytes'], [4, f(L[6].n) + ' bytes'], [4, 'Seven messages']]);
      if (L.length !== 7) out.push('legacy conversation is not seven messages');
      need('sx-life-modern', [[0, M[0].n + ' bytes'], [0, M[1].n + ' bytes'], [1, M[2].n + ' bytes'], [1, MCP_LIFE.metaB + ' bytes'], [2, M[3].n + ' bytes'], [3, M[4].n + ' bytes'], [3, f(M[5].n) + ' bytes']]);
      const T = MCP_TP, s2 = v => v.toFixed(2) + ' ms';
      need('sx-tp', [[0, T.cold + ' ms'], [1, s2(T.SP.med)], [1, 'median of ' + T.SP.n], [2, s2(T.HS.med)], [3, 'shard 1 of 3'], [4, T.BAD[0].st], [4, T.BAD[1].st], [4, T.BAD[2].st + ' with'], [4, T.BAD[2].code],
        [5, s2(T.SP.med)], [5, T.SL.med.toFixed(2)], [5, s2(T.HS.med)], [5, T.HJ.med.toFixed(2)], [5, s2(T.HL.med)]]);
      if (T.prog.length !== 3) out.push('progress stream is not three events');
      MCPD.rep.forEach((r, i) => { const id = 'sx-rep-' + i, n = r.trace.length; need(id, [[n, r.ok === 0 ? (i === 2 ? 'Fails 20 of 20' : '0 of 20') : '20 of 20']]);
        r.trace.forEach((t, k) => { if (t.st === 404 || t.st === 202) need(id, [[k, String(t.st)]]); }); });
      if (MCPD.rep[0].trace[1].st !== 404 || MCPD.rep[0].trace[3].st !== 404 || MCPD.rep[2].trace[1].st !== 400 || MCPD.rep[3].trace[1].st !== 200) out.push('replica outcomes are not the ones described');
      const A = MCP_AUTH, http = MCPD.auth.steps.filter(s => s.src !== 'as->cimd').length;
      need('sx-auth', [[0, String(A.status(1))], [5, A.tok.expires_in / 60 + ' minutes'], [5, A.tok.scope], [6, ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][http / 2] + ' HTTP exchanges']]);
      if (A.G.flat().length !== A.n) out.push('the auth stretches do not cover every recorded exchange');
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
