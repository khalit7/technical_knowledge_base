// The 2026-11-06 rollout checks for the Auth page: every 3D stage plays by itself once scrolled into view, steps to its last step in every mode with
// one step-list item per step, stops redrawing off screen and never moves under reduced motion; no errors, NaN, undefined or sideways scroll; the
// splits are two columns at 1400 px. The recorded values written into the step lists are checked against the page's own data (window.AUTHDATA),
// and the scenes' step tables (AU_OAUTH_STEPS, AU_XCHG_STEPS) against the lists.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_protocols/auth/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// [stage, mode chips or null, {mode: step list}]
const STAGES = [['stg-hero', null, { all: 'sx-hero' }],
  ['stg-oauth', 'oa-mode', { implicit: 'sx-oa-implicit', nopkce: 'sx-oa-nopkce', pkce: 'sx-oa-pkce' }],
  ['stg-jwt', null, { all: 'sx-jwt' }], ['stg-mtls', null, { all: 'sx-mtls' }],
  ['stg-xchg', 'xc-mode', { strict: 'sx-xc-strict', naive: 'sx-xc-naive', xchg: 'sx-xc-xchg' }]];
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
  if (width === 1400) {
    const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
    if (!cols.length || cols.some(c => c !== 'grid')) problems.push(`${tag}: a split is not two columns (${cols})`);
  } else {
    const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
    if (cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  }
  // autoplay on view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('sec-debug').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step in every mode; list length; screenshot mid-way
  for (const [id, chips, lists] of STAGES) {
    for (const [m, lid] of Object.entries(lists)) {
      if (chips) { await p.$eval(`#${chips} button[data-m="${m}"]`, e => e.click()); await wait(100) }
      await p.$eval(`#${id}-b`, e => e.click());
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but list ${lid} shows ${lis}`);
      for (let k = 1; k < n; k++) {
        await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
        if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${m}-mid-${scheme}-${width}.png` }) }
      }
      await wait(2000);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m} ended on ${sh}`);
      if (width === 1400) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${m}-last-${scheme}-${width}.png` }) }
      await audit(`${id} ${m} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    }
  }
  if (width === 1400) { // the step lists' recorded values are the page's data
    const r = await p.evaluate(() => { const out = [], D = AUTHDATA, ph = D.sdk.phases;
      const li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const R0 = D.flows.R[0].body, saw = ph.D.upstream_body.upstream_believes_caller_is, nb = ph.C_naive.upstream_body.upstream_believes_caller_is;
      need('sx-hero', [[0, R0.expires_in + ' s'], [0, R0.scope], [2, ph.C_strict.upstream_body.error_description], [3, saw.scope], [5, R0.expires_in + ' s of ' + R0.scope]]);
      const pk = D.flows.P[0].body; need('sx-oa-pkce', [[6, pk.error + ': ' + pk.error_description]]);
      const good = D.jwt.cases.find(c => c.id === 'good'); need('sx-jwt', [[3, good.pinned.why]]);
      if (!good.pinned.ok) out.push('the good token did not verify in the recording');
      need('sx-xc-strict', [[2, ph.C_strict.upstream_body.error_description]]);
      need('sx-xc-naive', [[2, nb.sub], [2, nb.client_id]]); if (nb.act !== null) out.push('naive: the upstream saw an act claim');
      need('sx-xc-xchg', [[2, saw.scope], [2, saw.act.sub], [4, 'sub ' + saw.sub], [4, saw.client_id], [4, JSON.stringify(saw.act).replace(':', ': ')]]);
      const tx = D.wire.find(w => w.phase === 'D exchange').ex[1].resp; if (!/"expires_in": 300/.test(tx) || !/"scope": "mail:read"/.test(tx)) out.push('exchange response is not the one described');
      for (const [m, lid] of [['implicit', 'sx-oa-implicit'], ['nopkce', 'sx-oa-nopkce'], ['pkce', 'sx-oa-pkce']]) if (AU_OAUTH_STEPS[m].length !== document.getElementById(lid).children.length) out.push(`oauth ${m}: scene and list differ in length`);
      for (const [m, lid] of [['strict', 'sx-xc-strict'], ['naive', 'sx-xc-naive'], ['xchg', 'sx-xc-xchg']]) if (AU_XCHG_STEPS[m].length !== document.getElementById(lid).children.length) out.push(`xchg ${m}: scene and list differ in length`);
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
