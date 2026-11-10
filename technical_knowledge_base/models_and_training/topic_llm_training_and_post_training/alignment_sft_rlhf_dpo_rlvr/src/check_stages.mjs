// The 2026-11-06 rollout checks for Alignment (2026-11-10), adapted from Post-training data's check_stages.mjs: the five 3D stages
// (Fig. 2 padding and packing, Fig. 3 the reward model, Fig. 4 PPO and GRPO, Fig. 5 one pair through eight losses, Fig. 7 the verifier) and the
// 2D push-against-margin animation play by themselves once scrolled into view, step to their last step with one step-list item per step, stop
// redrawing off screen and never move under reduced motion; mode switches (PPO/GRPO, the eight losses) replay; no errors, NaN, undefined or
// sideways scroll; splits are two columns at 1400 px and one below 1100 px; the numbers written in the step lists equal what the page's own data
// gives when recomputed here in JavaScript (window.AL_DATA, window.LFX).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/alignment_sft_rlhf_dpo_rlvr/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-pack', 'sx-pack'], ['stg-rm', 'sx-rm'], ['stg-rl', 'sx-ppo'], ['stg-pr', 'sx-pr'], ['stg-rv', 'sx-rv']];
const ANIMS = [['lfx', 'lfxCtl', 'sx-lfx']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
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
  // every stage plays once in view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  // flows stop off screen
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid, label) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(800); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${label} ended on ${sh}`);
    await audit(`${id}${label} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${label} list does not mark the last step`);
  };
  for (const [id, lid] of STAGES) await stepAll(id, lid, '');
  // the GRPO mode of Fig. 4: its own list, replays from step 1
  await p.$eval('#rlM button[data-m="grpo"]', e => e.click()); await wait(200);
  { const st = await p.$eval('#stg-rl .stg-st', e => e.textContent), hid = await p.$eval('#sx-ppo', e => e.hidden);
    if (!/^step 1 of 5/.test(st) || !hid) problems.push(`${tag}: GRPO did not swap the list (${st}, ppo hidden ${hid})`) }
  await stepAll('stg-rl', 'sx-grpo', '-grpo');
  await p.$eval('#rlM button[data-m="ppo"]', e => e.click());
  // every loss of Fig. 5: replays, and its readout has no NaN at every step
  const ms = await p.$$eval('#prM button', bs => bs.map(b => b.dataset.m));
  if (ms.length !== 8) problems.push(`${tag}: ${ms.length} losses in the picker`);
  for (const m of ms) { await p.$eval(`#prM button[data-m="${m}"]`, e => e.click()); await wait(120);
    const st = await p.$eval('#stg-pr .stg-st', e => e.textContent); if (!/^step 1 of 6/.test(st)) problems.push(`${tag}: loss ${m} did not restart Fig. 5 (${st})`);
    for (let k = 0; k < 6; k++) { await p.evaluate(k => { const e = document.getElementById('stg-pr-r'); e.value = k; e.dispatchEvent(new Event('input')) }, k);
      const t = await p.$eval('#prRo', e => e.innerText); if (/NaN|undefined|Infinity/.test(t)) problems.push(`${tag}: readout ${m} step ${k + 1}: ${t.slice(0, 80)}`) }
    if (shoot && ['rm', 'simpo', 'ipo'].includes(m)) { await p.$eval('#stg-pr', e => e.scrollIntoView({ block: 'center' })); await wait(2200); await (await p.$('#stg-pr')).screenshot({ path: `${shots}/x-stg-pr-${m}-last-${scheme}-${width}.png` }) } }
  await p.$eval('#prM button[data-m="dpo"]', e => e.click());
  // the 2D animation
  for (const [card, ctl, lid] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2600);
    const pl = await p.$eval(`#${card} .an-play`, e => e.getAttribute('aria-label')); if (pl !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
    if (shoot) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-playing-${scheme}-${width}.png` });
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length); if (n !== lis) problems.push(`${tag}: ${card} has ${n} steps, list ${lis}`);
    for (let k = 0; k < n; k++) await p.$eval(`#${ctl}-f`, e => e.click());
    const at = await p.$eval(`#${ctl}-s`, e => +e.value); if (at !== n - 1) problems.push(`${tag}: ${card} ended at ${at}`);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (cur !== n - 1) problems.push(`${tag}: ${lid} does not mark the last step`);
    if (shoot) { await wait(500); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-last-${scheme}-${width}.png` }) }
    await audit(`${card} last step`);
  }
  if (width === 1400) { // the step lists' numbers are what the page's data gives, recomputed here
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const f = n => Math.round(n).toLocaleString('en-US'), pc = x => (100 * x).toFixed(1) + '%', mn = x => (x < 0 ? '−' : '') + Math.abs(x).toFixed(2), sg = x => (x < -.005 ? '−' : x > .005 ? '+' : '') + Math.abs(x).toFixed(2);
      const D = AL_DATA, B = D.sft.batch, M = D.maxlen, T = B.map(b => b.t), L = B.map(b => b.l), mx = Math.max(...T), sT = T.reduce((a, b) => a + b, 0), sL = L.reduce((a, b) => a + b, 0);
      // Fig. 2: padding, best-fit decreasing, the leak, the weights
      need('sx-pack', 0, f(Math.min(...T)) + ' to ' + f(mx)); need('sx-pack', 0, f(sL) + ' of the ' + f(sT));
      need('sx-pack', 1, f(8 * mx) + ' positions computed for ' + f(sT)); need('sx-pack', 1, pc(sT / (8 * mx)));
      const bins = []; [...T.keys()].sort((a, b) => T[b] - T[a]).forEach(i => { let best = null; bins.forEach(bn => { if (bn.free >= T[i] && (!best || bn.free < best.free)) best = bn });
        if (!best) { best = { free: M, items: [] }; bins.push(best) } best.items.push(i); best.free -= T[i] });
      if (JSON.stringify(bins.map(b => b.items)) !== JSON.stringify(D.stage.b_bins)) out.push('JS packing differs from recompute.py');
      need('sx-pack', 2, bins.length + ' rows of 4,096, ' + f(bins.length * M) + ' positions, ' + pc(sT / (bins.length * M)));
      let cr = 0, al = 0; bins.forEach(bn => { let bf = 0; bn.items.forEach(i => { cr += T[i] * bf; al += T[i] * (T[i] + 1) / 2 + T[i] * bf; bf += T[i] }) });
      need('sx-pack', 3, pc(cr / al) + ' of the attention pairs'); need('sx-pack', 3, pc(D.sft.cross_share) + ' over the whole sample');
      const is = L.indexOf(Math.min(...L)), il = L.indexOf(Math.max(...L));
      need('sx-pack', 5, '12.5%'); need('sx-pack', 5, '#' + (is + 1) + '’s ' + L[is] + '-token answer weighs ' + (L[il] / L[is]).toFixed(1) + ' times one of #' + (il + 1) + '’s ' + f(L[il]));
      need('sx-pack', 6, 'to ' + pc(L[is] / sL)); need('sx-pack', 6, 'rises to ' + pc(L[il] / sL));
      // Fig. 3: Bradley-Terry on A > B > C > D, recomputed
      const pr = []; for (let w = 0; w < 4; w++) for (let l = w + 1; l < 4; l++) pr.push([w, l]);
      let rr = [0, 0, 0, 0]; const sig = x => 1 / (1 + Math.exp(-x)), lossOf = r => pr.reduce((s, [w, l]) => s + Math.log1p(Math.exp(-(r[w] - r[l]))), 0) / 6;
      const l0 = lossOf(rr); for (let s = 0; s < 200; s++) { const g = [0, 0, 0, 0]; pr.forEach(([w, l]) => { const q = sig(-(rr[w] - rr[l])) / 6; g[w] -= q; g[l] += q }); rr = rr.map((v, i) => v - g[i]) }
      need('sx-rm', 2, 'ln 2 = ' + l0.toFixed(3)); need('sx-rm', 3, 'A ' + mn(rr[0]) + ', B ' + mn(rr[1]) + ', C ' + mn(rr[2]) + ', D ' + mn(rr[3]) + ', loss ' + lossOf(rr).toFixed(3));
      need('sx-rm', 4, 'σ(' + (rr[0] - rr[3]).toFixed(2) + ') = ' + (100 * sig(rr[0] - rr[3])).toFixed(2) + '%');
      // Figs. 4 and 7: group-relative advantages
      const adv = rs => { const m = rs.reduce((a, b) => a + b, 0) / rs.length, sd = Math.sqrt(rs.reduce((a, x) => a + (x - m) ** 2, 0) / rs.length); return { a: rs.map(x => sd ? (x - m) / sd : 0), m, sd } };
      const G = D.stage.grpo_rm, A1 = adv(G.r); need('sx-grpo', 2, G.r.map(mn).join(', ')); need('sx-grpo', 3, 'mean ' + A1.m.toFixed(2) + ', standard deviation ' + A1.sd.toFixed(2) + ', so the advantages are ' + A1.a.map(sg).join(', '));
      const VV = D.stage.grpo_ver, A2 = adv(VV.r), A3 = adv(VV.r.map(x => x / 10));
      need('sx-rv', 0, VV.r.filter(x => x > 0).length + ' of them right'); need('sx-rv', 3, 'Mean ' + A2.m.toFixed(2) + ', standard deviation ' + A2.sd.toFixed(2) + ': each accepted answer gets ' + sg(Math.max(...A2.a)) + ', each rejected one ' + sg(Math.min(...A2.a)));
      if (A2.a.some((x, i) => Math.abs(x - A3.a[i]) > 1e-12)) out.push('rewards of 1 and 0 do not give the same advantages');
      // Fig. 5: the pair's starting log-probabilities and where cDPO and IPO stop
      const Xp = AL_PAIR; need('sx-pr', 0, (Xp.sRefR < 0 ? '−' : '') + Math.abs(Xp.sRefR).toFixed(2) + ' against ' + '−' + Math.abs(Xp.sRefC).toFixed(2));
      const RN = AL_PAIR_UI.RUN, e = m => RN[m].traj[400].margin; if (Math.abs(e('cdpo') - Math.log(9)) > .01 || Math.abs(e('ipo') - 5) > .01) out.push('cDPO or IPO no longer stop where sx-pr says');
      // the push-against-margin list: the DPO page's toy outcomes
      const Z = window.LFX, pcz = v => (100 * v).toFixed(1) + '%';
      need('sx-lfx', 0, '(' + pcz(Z['Unlikelihood α = 1'].g) + ' grammatical)'); const zd = Z['DPO β = 0.1'], zi = Z['IPO τ = 0.1'];
      need('sx-lfx', 1, zd.kl1200.toFixed(2) + ' at 1,200 steps, ' + zd.kl.toFixed(2) + ' at 4,000'); need('sx-lfx', 3, zi.kl1200.toFixed(2) + ' at 1,200 steps, ' + zi.kl.toFixed(2) + ' at 4,000, against DPO\'s climb from ' + zd.kl1200.toFixed(2) + ' to ' + zd.kl.toFixed(2));
      need('sx-lfx', 5, '(' + pcz(Z['SimPO β = 2, γ = 1'].g) + ' grammatical)');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-tree', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  for (const [card] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    const fr = await p.$eval('#' + card, c => [c.querySelector('.an-play').getAttribute('aria-label'), +c.querySelector('input[type=range]').value]); if (fr[0] !== 'Play' || fr[1] !== 0) problems.push(`reduced motion: ${card} moved by itself (${fr})`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
