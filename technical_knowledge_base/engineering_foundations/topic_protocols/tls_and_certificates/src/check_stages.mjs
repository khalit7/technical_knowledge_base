// The 2026-11-06 rollout checks for the TLS and certificates page: every 3D stage and 2D animation plays by itself once scrolled into view,
// steps to its last step in every mode with one step-list item per step, stops redrawing off screen and never moves under reduced motion;
// the record-by-record widget never plays by itself; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px
// and one below 1100 px. The recorded values written into the step lists are checked against the page's data (window.D, read by the
// scenes into TLS_HERO, TLS_HS, TLS_RES, TLS_CHAIN, TLS_MTLS).
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_protocols/tls_and_certificates/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// stage id, its mode chips (selector), modes, the step-list id for each mode
const STAGES = [['stg-hero', null, [null], () => 'sx-hero'], ['stg-hs', null, [null], () => 'sx-hs'], ['stg-res', '#res-mode', ['res', 'zr'], m => 'sx-res-' + m],
  ['stg-chain', null, [null], () => 'sx-chain'], ['stg-mtls', null, [null], () => 'sx-mtls']];
// 2D animations (RD.anim): card, control prefix, mode buttons, modes, list for each mode
const ANIMS = [['obs-card', 'obs-ctl', '#obs-mode', ['tls12', 'tls13'], () => 'sx-obs'], ['acme-card', 'acme-ctl', '#acme-pick', ['0', '1', '2', '3'], () => 'sx-acme'],
  ['fl-card', 'fl-ctl', '#fl-mode', ['tls13', 'rsa', 'mldsa44', 'mldsa65'], () => 'sx-fl']];
const WIDGETS = [['hs-card', 'hs-ctl']];
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
  // autoplay on view: a stage's data-frames rises; an RD.anim's play button reads Pause; a widget stays still
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (!/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  for (const [card, ctl] of WIDGETS) {
    const v0 = await p.$eval(`#${ctl}-s`, e => e.value);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2500);
    const [lab, v1] = await p.$eval(`#${ctl}-p`, e => [e.textContent, document.getElementById(e.id.slice(0, -1) + 's').value]);
    if (/Pause/.test(lab) || v1 !== v0) problems.push(`${tag}: widget ${card} moved by itself (${v0} -> ${v1})`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('s-ml').getBoundingClientRect().top + scrollY)); await wait(800);
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
  for (const [card, ctl, sel, modes, lidOf] of ANIMS) for (const m of modes) {
    if (sel) { await p.$eval(`${sel} [data-m="${m}"]`, e => e.click()); await wait(100); }
    const lid = lidOf(m), n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card}${m == null ? '' : '-' + m} has ${n} steps but list ${lid} shows ${lis}`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    if (await p.$eval(`#${ctl}-s`, e => +e.value) !== n - 1) problems.push(`${tag}: ${card} did not reach its last step from the list`);
    if (width === 1400 || width === 390) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(300); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}${m == null ? '' : '-' + m}-last-${scheme}-${width}.png` }) }
    await audit(`${card} last step`);
  }
  if (width === 1400) { // the step lists' recorded values are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const f = n => Number(n).toLocaleString('en-GB');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const H = TLS_HERO, S = TLS_HS, R = TLS_RES, C = TLS_CHAIN, M = TLS_MTLS;
      need('sx-hero', [[1, f(H.ksC) + ' bytes'], [1, f(H.ksS)], [2, 'leaf ' + H.leaf + ' bytes'], [2, 'intermediate ' + H.inter], [2, H.sig + '-byte signature'], [3, H.fin + ' bytes each way'], [4, H.reqA + '-byte request'], [4, H.req + '-byte record']]);
      need('sx-hs', [[0, f(S.ch) + ' bytes'], [0, f(S.ksC) + ' bytes'], [0, '(' + S.ksC2 + ')'], [1, f(S.sh) + ' bytes'], [1, f(S.ksS) + ' bytes'], [2, S.ee + ' bytes'], [2, S.cert + ' bytes'], [2, S.leaf + ' bytes'], [2, S.inter + ' bytes'],
        [3, S.cv + ' bytes'], [3, S.sig + ' bytes'], [3, S.fin + ' bytes'], [4, S.req + '-byte record'], [5, S.nst + ' bytes'], [5, S.resp + ', then ' + S.tokMin + ' to ' + S.tokMax]]);
      need('sx-res-res', [[0, R.nst + ' bytes'], [2, R.full + ' ms'], [2, R.res + ' ms'], [2, R.keep + ' ms'], [2, 'p90 ' + R.full9], [2, 'p90 ' + R.res9], [2, R.n + ' small requests']]);
      need('sx-res-zr', [[0, f(R.ff) + ' bytes'], [0, 'generation ' + R.gens[1]], [1, f(R.ff) + ' bytes'], [2, 'front end ' + R.fes[2]], [2, 'generation ' + R.gens[2]], [3, 'front end ' + R.fes[3]], [3, 'generation ' + R.gens[3]],
        [4, 'Generation ' + R.gens[4]], [5, R.st425 + ' Too Early'], [5, 'Early-Data: ' + R.hdr]]);
      if (R.gen425 !== null || R.rep425 !== 425) out.push('the RFC 8470 run is not the one sx-res-zr describes');
      need('sx-chain', [[0, C.n === 3 ? 'three certificates' : 'xx'], [0, C.host + ' (' + C.der[0] + ' bytes)'], [0, C.cn[1] + ' (' + C.der[1] + ')'], [0, C.cn[2] + ' (' + C.der[2] + ')'], [1, C.sig[0]], [2, C.sig[1]], [4, C.topIssuer], [4, C.sig[2]],
        [5, C.nb + ' to ' + C.na + ', ' + C.days + ' days'], [6, C.san.join(', ')], [6, C.eku.join(', ') + ' only']]);
      if (!(C.ca[0] === false && C.ca[1] && C.ca[2])) out.push('CA flags differ from sx-chain');
      need('sx-mtls', [[0, M.cr + ' bytes'], [1, f(M.cc) + ' bytes'], [1, M.spiffe], [3, f(M.c2s0) + ' to ' + f(M.c2s1)], [5, M.ms + ' ms']]);
      if (M.na !== '2026-10-06' || M.rec !== '2026-10-05') out.push('client certificate is not the one-day certificate sx-mtls describes');
      if (M.fpOld !== M.still || M.fpOld === M.fpNew) out.push('rotation run is not as sx-mtls describes');
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
  for (const [card, ctl] of ANIMS.concat(WIDGETS.map(([c, k]) => [c, k]))) { const v0 = await p.$eval(`#${ctl}-s`, e => e.value);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const v1 = await p.$eval(`#${ctl}-s`, e => e.value); if (v1 !== v0 || /Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`reduced motion: ${card} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
