// The 2026-11-06 rollout checks for Slurm from zero (2026-11-12), adapted from Kubernetes for ML's check_stages.mjs:
// the three 3D stages (the hero, main loop and backfill, fairshare) and the two 2D animations with step lists (a job's life in eight
// stages, four steps with and without --exact) play by themselves once scrolled into view, step to their last step with one step-list
// item per step, and never move under reduced motion; stages stop redrawing off screen; mode buttons swap the step list and replay;
// no errors, NaN, undefined or sideways scroll in any tab; splits are two columns at 1400 px and one below 1100 px; scene labels do not
// overlap or leave the card at 1400 px; the numbers in the step lists equal the page's recorded data (window.SL).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_ml_infra_and_orchestration/slurm/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-bf', 'sx-bf'], ['stg-fs', 'sx-fs']];
// 2D animations with a step list: [card, controls, list, [mode buttons, [[mode, list]]]]
const ANIMS = [['sl-lf-card', 'sl-lf-ctl', 'sx-lf-busy', ['sl-lf-mode', [['idle', 'sx-lf-idle'], ['busy', 'sx-lf-busy']]]],
  ['sl-st-card', 'sl-st-ctl', 'sx-st-plain', ['sl-st-mode', [['exact', 'sx-st-exact'], ['plain', 'sx-st-plain']]]]];
const SPLITS = { 't-read': 11, 't-why': 1 };
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
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap or leave the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.SLSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.SLSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  for (const [tab, n] of Object.entries(SPLITS)) {
    await p.click(`#tabs button[data-t="${tab}"]`); await wait(300);
    const cols = await p.$$eval(`#${tab} .s3sp`, xs => xs.map(x => getComputedStyle(x).display));
    if (width === 1400 && (cols.length !== n || cols.some(c => c !== 'grid'))) problems.push(`${tag}: ${tab} splits are not ${n} two-column grids (${cols.length}: ${cols})`);
    if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: ${tab} has a split with two columns below 1100 px`);
    if (width === 1400) {
      const over = await p.$$eval(`#${tab} .s3R`, xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
      over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    }
  }
  await p.click('#tabs button[data-t="t-read"]'); await wait(300);
  if (width === 1400) {
    // the step lists against the recorded data, recomputed here from window.SL
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim(), S = window.SL;
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const fmt = n => Math.round(n).toLocaleString('en-US'), ms = s => Math.round(s * 1000) + ' ms';
      // the hero: job 79's own log
      const H = window.SL_HERO, E = S.busy.events, blk = E.filter(e => e.k === 'blk');
      if (!/limit 1 min/.test(blk[0].txt) || !/12 GPUs/.test(blk[0].txt)) out.push('hero: the blocker is not the 12-GPU, 1-minute job');
      need('sx-hero', 1, H.clk(H.T.sub)); need('sx-hero', 1, 'priority ' + H.prio);
      need('sx-hero', 2, H.clk(H.T.plan).slice(0, 8)); need('sx-hero', 2, '(' + H.nplan + ' times)');
      need('sx-hero', 3, H.clk(H.T.blkEnd)); need('sx-hero', 3, Math.round(H.T.blkEnd - blk[1].t) + ' s into its limit'); need('sx-hero', 3, H.ms + ' ms later'); need('sx-hero', 3, Math.round(H.early) + ' s before the plan');
      need('sx-hero', 4, String(H.gloss)); need('sx-hero', 5, H.clk(H.T.epi));
      // a job's life: the stages and their numbers
      const LF = window.SL_LF, g = (m, k, last) => { const a = LF.evs(m).filter(e => e.k === k); return (last ? a[a.length - 1] : a[0]).rt };
      for (const m of ['busy', 'idle']) if (LF.stages(m).length !== document.getElementById('sx-lf-' + m).children.length) out.push(`lifecycle ${m}: stages and list items differ`);
      need('sx-lf-busy', 1, H.clk(S.busy.pstart).slice(0, 8)); need('sx-lf-busy', 1, S.busy.nplan + ' times');
      need('sx-lf-busy', 2, H.clk(H.T.blkEnd)); need('sx-lf-busy', 2, H.ms + ' ms later'); need('sx-lf-busy', 2, Math.round(H.early) + ' s before the plan');
      need('sx-lf-busy', 3, ms(g('busy', 'prolog') - g('busy', 'alloc')) + ' later'); need('sx-lf-busy', 5, (g('busy', 'train') - g('busy', 'step')).toFixed(1) + ' s later'); need('sx-lf-busy', 5, S.busy.wall.toFixed(1) + ' s');
      need('sx-lf-idle', 0, 'InitPrio=' + /InitPrio=(\d+)/.exec(S.idle.events.find(e => e.k === 'submit').raw)[1]); need('sx-lf-idle', 1, ms(g('idle', 'alloc')));
      need('sx-lf-idle', 3, ms(g('idle', 'prolog') - g('idle', 'alloc')) + ' after'); need('sx-lf-idle', 4, ms(g('idle', 'batch') - g('idle', 'prolog')) + ' later');
      need('sx-lf-idle', 5, (g('idle', 'train') - g('idle', 'step')).toFixed(1) + ' s later'); need('sx-lf-idle', 5, S.idle.wall.toFixed(1) + ' s');
      const span = m => (g(m, 'epilog', true) - g(m, 'alloc')).toFixed(1);
      need('sx-lf-idle', 7, span('idle') + ' s after the allocation'); need('sx-lf-idle', 7, span('busy') + ' s for job 79');
      // steps: the recorded sacct rows
      const ST = window.SL_ST, par = m => ST.P[m].rows;
      need('sx-st-plain', 2, 'Done at ' + ST.P.plain.end + ' s'); need('sx-st-exact', 1, 'Done at ' + ST.P.exact.end + ' s');
      need('sx-st-plain', 0, 'cpu=' + par('plain')[0].cpu); if (par('exact').some(r => r.cpu !== 1)) out.push('steps: an --exact step held more than 1 CPU');
      if (par('plain').filter(r => r.s === 0).length !== 2 || par('exact').filter(r => r.s === 0).length !== 4) out.push('steps: the waves differ from the list');
      // fairshare: sprio and sshare
      const F = window.SL_FS, N = S.snaps, sp = (i, id) => N[i].sprio[id], tm = (i, t) => F.SH[i].team[t].eff.toFixed(2), uf = (i, u) => String(F.SH[i].user[u].fs).replace(/0+$/, '').replace(/\.$/, '');
      need('sx-fs', 0, fmt(sp(0, '95').prio)); need('sx-fs', 0, fmt(sp(0, '95').fs) + ' is fairshare'); if (F.RK[0]['95'] !== 0) out.push('fairshare: 95 does not lead at the first snapshot');
      need('sx-fs', 1, 'EffectvUsage ' + tm(0, 'teamb') + ' against ' + tm(0, 'teama')); need('sx-fs', 1, 'a factor of ' + uf(0, 'bob') + ': ' + fmt(sp(0, '95').fs) + ' points');
      need('sx-fs', 1, 'alice got ' + uf(0, 'alice') + ' (' + fmt(sp(0, '82').fs) + ')'); need('sx-fs', 1, 'carol ' + uf(0, 'carol') + ' (' + fmt(sp(0, '93').fs) + ')');
      need('sx-fs', 1, (Object.keys(F.SH[0].user).length + 1) + ' users');
      need('sx-fs', 2, 'job ' + F.blk); need('sx-fs', 2, fmt(F.SH[1].team.teamb.raw) + ' against teama\'s ' + fmt(F.SH[1].team.teama.raw)); need('sx-fs', 2, tm(1, 'teamb') + ' against ' + tm(1, 'teama'));
      need('sx-fs', 3, '(' + uf(1, 'bob') + ': ' + fmt(sp(1, '95').fs) + ' points)'); need('sx-fs', 3, 'alice rises to ' + uf(1, 'alice') + ' (' + fmt(sp(1, '82').fs) + ')'); need('sx-fs', 3, 'to ' + uf(1, 'carol') + ' (' + fmt(sp(1, '93').fs) + ')');
      const ages = F.ids.map(id => sp(1, id).age); need('sx-fs', 3, Math.min(...ages) + ' to ' + Math.max(...ages) + ' points'); need('sx-fs', 3, fmt(sp(0, '95').fs - sp(1, '95').fs) + ' points');
      if (F.RK[1]['95'] !== F.ids.length - 1 || F.ids.length !== 11) out.push('fairshare: 95 is not last of eleven at the second snapshot');
      need('sx-fs', 4, 'at ' + fmt(sp(1, '95').prio)); need('sx-fs', 4, 'leads at ' + fmt(sp(1, '93').prio)); if (F.RK[1]['93'] !== 0) out.push('fairshare: 93 does not lead at the second snapshot');
      need('sx-fs', 4, N[1].q.find(q => q.id === '93').reason);
      const below = N[1].q.filter(q => q.st === 'PD' && q.prio < sp(1, '95').prio); if (below.length !== 2 || below.some(q => q.prio !== 0)) out.push('fairshare: the jobs below 95 in squeue are not the two held jobs');
      // main loop and backfill (illustrative): the list matches the scene's own states
      const BF = window.SL_BF.S; need('sx-bf', 2, BF[2].B.s + ' to ' + BF[2].B.e); need('sx-bf', 3, 'minute ' + BF[3].C.s + ' to ' + BF[3].C.e);
      need('sx-bf', 4, '(here ' + BF[4].D.s + ')'); need('sx-bf', 5, 'from ' + BF[4].B.s + ' to ' + BF[5].B.s); need('sx-bf', 5, 'from ' + BF[4].D.s + ' to ' + BF[5].D.s);
      need('sx-bf', 5, 'A ends at ' + BF[5].now); need('sx-bf', 6, 'C ends at ' + BF[6].now); need('sx-bf', 6, (BF[2].B.s - BF[6].B.s) + ' minutes before the first plan');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and 2D animation plays once scrolled into view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1600);
    if (await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')) !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  // off screen: the end of the Reading tab, far from every stage
  await p.evaluate(() => window.scrollTo(0, document.getElementById('t-read').getBoundingClientRect().bottom + scrollY - innerHeight)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(900); await overlaps(id, `step ${k + 1} mid-tween`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1900); await overlaps(id, `step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(2800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  };
  for (const [id, lid] of STAGES) await stepAll(id, lid);
  // the 2D animations: step to the end, one list item per step, the list marks the step, modes swap the list and replay
  const step2d = async (card, ctl, lid, label) => {
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card}${label} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval(`#${ctl}-b`, e => e.click()); for (let k = 0; k < n; k++) await p.$eval(`#${ctl}-f`, e => e.click());
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${card}${label} list does not mark the last step`);
    await p.evaluate(lid => document.getElementById(lid).children[1].click(), lid);
    if (+(await p.$eval(`#${ctl}-s`, e => e.value)) !== 1) problems.push(`${tag}: ${card}${label} list click does not move the animation`);
    if (shoot) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(300); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}${label}-s2-${scheme}-${width}.png` }) }
    await audit(`${card}${label}`);
  };
  for (const [card, ctl, lid, modes] of ANIMS) {
    await step2d(card, ctl, lid, '');
    for (const [m, ml] of modes[1]) {
      await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(300);
      await p.$eval(`#${modes[0]} button[data-m="${m}"]`, e => e.click()); await wait(400);
      if (await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')) !== 'Pause') problems.push(`${tag}: ${card} mode ${m} did not replay`);
      if (await p.$eval('#' + ml, e => e.hidden)) problems.push(`${tag}: ${card} mode ${m} did not show list ${ml}`);
      await step2d(card, ctl, ml, '-' + m);
    }
  }
  await audit('end');
  for (const t of ['t-why', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t);
    if (shoot) await p.screenshot({ path: `${shots}/x-${t}-${scheme}-${width}.png` }) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1400);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1400);
    const r = await p.evaluate(ctl => [document.getElementById(ctl + '-p').getAttribute('aria-label'), +document.getElementById(ctl + '-s').value], ctl); if (r[0] !== 'Play' || r[1] !== 0) problems.push(`reduced motion: ${card} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
