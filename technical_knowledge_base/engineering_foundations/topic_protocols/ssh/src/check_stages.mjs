// The 2026-11-06 rollout checks for the SSH page: every 3D stage and 2D animation plays by itself once scrolled into view, steps to its
// last step in every mode with one step-list item per step, stops redrawing off screen and never moves under reduced motion; no errors,
// NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px. The recorded values written into the
// step lists are checked against the page's data (window.SSHD, read by the scenes into SSH_HERO, SSH_AGENT, SSH_MUX, SSH_FWD).
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_protocols/ssh/src/check_stages.mjs [shots dir]
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
const STAGES = [['stg-hero', null, [null], () => 'sx-hero'], ['stg-jump', null, [null], () => 'sx-jump'],
  ['stg-agent', '#ag-mode', ['forward', 'constrained', 'proxyjump'], m => 'sx-ag-' + m], ['stg-mux', null, [null], () => 'sx-mux'], ['stg-fwd', null, [null], () => 'sx-fwd']];
// 2D animations (RD.anim): card, control prefix, mode buttons, modes, list for each mode
const ANIMS = [['hs-card', 'hs-ctl', '#hs-seg', ['curve25519-sha256', 'sntrup761x25519-sha512', 'ecdh-sha2-nistp256', 'mlkem768x25519-sha256'], () => 'sx-hs'],
  ['hk-card', 'hk-ctl', null, [null], () => 'sx-hk'], ['hc-card', 'hc-ctl', null, [null], () => 'sx-hc']];
const WIDGETS = [];
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
  await p.evaluate(() => window.scrollTo(0, document.getElementById('s-pq').getBoundingClientRect().top + scrollY)); await wait(800);
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
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const H = SSH_HERO, A = SSH_AGENT, M = SSH_MUX, F = SSH_FWD, N = SSHD.N;
      need('sx-hero', [[1, H.bc], [1, H.bs], [1, H.kc + ' and ' + H.ks + ' bytes'], [2, H.ini + ' bytes'], [2, H.rep + ' bytes'], [3, H.ec + ' bytes up and ' + H.es]]);
      need('sx-jump', [[3, N.jump_b + ' ms'], [3, N.jump_n + ' ms']]);
      if (!(A.fwd1 && A.fwd2)) out.push('agent forward run: root did not log in to both nodes, as sx-ag-forward says');
      if (!(A.con1 && !A.con2)) out.push('constrained run is not the one sx-ag-constrained describes');
      if (A.sockP || !A.sockF || !A.sockC) out.push('agent sockets are not as described');
      need('sx-mux', [[0, M.first + ' ms'], [1, M.medR + ' ms'], [3, N.mux_n + ' ms'], [3, N.mux_reuse + ' ms'], [4, 'exit status ' + M.exitCode + ' after ' + M.exitMs + ' ms']]);
      if (N.mux_first !== M.first || N.mux_reuse !== M.medR || String(N.mux_10_fresh_s) !== M.totF || String(N.mux_10_mux_s) !== M.totM) out.push(`mux numbers differ from the scene: ${JSON.stringify(M)}`);
      Object.entries(F).forEach(([k, v]) => { if (!v) out.push('forwarding log lacks what the scene draws: ' + k) });
      need('sx-fwd', [[0, '30988'], [0, '403'], [1, '30986'], [2, '30989'], [2, 'Could not resolve host'], [3, 'served from the laptop'], [4, 'exited 255']]);
      const hs = document.getElementById('sx-hs'); if (!/NEWKEYS/.test(hs.textContent)) out.push('sx-hs lacks NEWKEYS');
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
