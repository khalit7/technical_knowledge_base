// The 2026-11-06 layout and motion checks for the InstructGPT page (after GRAFT's), at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-hero, Fig. 1: the three steps at the paper's scale; #stg-ep, Fig. 3: one toy episode through PPO or PPO-ptx)
// each play by themselves once scrolled into view, step to their last step, and have exactly one step-list item per step (both modes of
// Fig. 3); flows stop drawing off screen; the Then and now animation (RD.anim) plays once in view and its list has one item per step;
// at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by
// itself; and every number the step lists state matches the data the stages draw (the page's recompute results and figures for Fig. 1,
// window.IG_EP for Fig. 3), and IG_EP itself equals the episode recomputed from the live toy in the page.
// Writes a mid-step and a last-step screenshot of each stage.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/instructgpt/src/check_stages.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const problems = []; let checked = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
const STAGE_MODES = { 'stg-ep': 'epM' };
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
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      const playing = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (!playing) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      // flows stop drawing off screen
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step through the forward button, with a middle screenshot
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(3600); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(3600);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (width === 1400) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
      if (STAGE_MODES[id]) for (const m of await p.$$eval(`#${STAGE_MODES[id]} button`, bs => bs.map(b => b.dataset.m))) {
        const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
        await clk(`#${STAGE_MODES[id]} button[data-m=${m}]`); await wait(2600);
        const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
        if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : ''] });
        if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${m}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps (${lm[2]})`);
        for (let k = 1; k < nm; k++) { await clk(`#${id}-f`); await wait(60); if (k === Math.floor(nm / 2)) { await wait(2100); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(2100); const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${nm} of ${nm}`) problems.push(`${tag}: ${id} ${m} ended on "${sh}"`);
        if (width === 1400) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-last-${scheme}-${width}.png` });
      }
    }
    // Then and now: a 2D step animation (RD.anim) that plays once in view, one list item per step, stops for good on a control
    if (t === 't-then') {
      await p.$eval('#thn', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!/Pause/.test(await p.$eval('#thnCtl-p', e => e.textContent))) problems.push(`${tag}: Then and now did not play when scrolled into view`);
      const n = await p.$eval('#thnCtl-s', e => +e.max + 1), lis = await p.$eval('#sx-thn', e => e.children.length); if (n !== lis) problems.push(`${tag}: Then and now has ${n} steps, ${lis} list items`);
      for (let k = 1; k < n; k++) await clk('#thnCtl-f');
      const last = await p.$eval('#sx-thn', l => [...l.children].findIndex(x => x.classList.contains('on'))); if (last !== n - 1) problems.push(`${tag}: Then and now list marks item ${last + 1} at the end`);
      if (/Pause/.test(await p.$eval('#thnCtl-p', e => e.textContent))) problems.push(`${tag}: Then and now still playing after a control`);
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
  for (const t of ['t-read', 't-then']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
    if (t === 't-then') { await p.$eval('#thn', e => e.scrollIntoView({ block: 'center' })); await wait(4500);
      const st = await p.$eval('#thnCtl-s', e => +e.value), pl = await p.$eval('#thnCtl-p', e => /Pause/.test(e.textContent)); if (st !== 0 || pl) problems.push('reduced motion: Then and now moved by itself') } }
  await p.close() }
{ // every number the step lists state is the one the stages draw; the episode data is the live toy's
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(async () => {
    const bad = []; let n = 0; const items = id => [...document.getElementById(id).children].map(li => li.textContent.replace(/\s+/g, ' '));
    const has = (L, i, s, id) => { n++; if (!L[i].includes(s)) bad.push(id + ' step ' + (i + 1) + ': expected "' + s + '"') };
    const g = v => Math.round(v).toLocaleString('en-GB'), pc = v => (100 * v).toFixed(1) + '%', sg = v => (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(2);
    // Fig. 1: the paper's numbers as the stage reads them
    const RC = window.PAPER.rc, Z = RC.sizes, L1 = items('sx-hero');
    has(L1, 0, g(Z.SFT.train) + ' for SFT', 'Fig. 1'); has(L1, 0, g(Z.RM.train) + ' for the reward model', 'Fig. 1'); has(L1, 0, g(Z.PPO.train) + ' for PPO', 'Fig. 1');
    has(L1, 0, Math.round(100 * RC.sft_labeler_share) + '% of the SFT prompts', 'Fig. 1'); has(L1, 0, Math.round(100 * RC.rm_labeler_share) + '% of the RM prompts', 'Fig. 1');
    has(L1, 2, 'C(9,2) = ' + 9 * 8 / 2, 'Fig. 1'); has(L1, 3, 'β = ' + RC.kl_default, 'Fig. 1'); has(L1, 4, 'γ = ' + RC.gamma_default, 'Fig. 1');
    has(L1, 4, g(RC.ptx_examples) + ' examples over the 256k episodes', 'Fig. 1'); n++; if (RC.ptx_examples !== 256000 * 8) bad.push('Fig. 1: ptx_examples is not 256k x 8');
    has(L1, 5, pc(RC.fig1['PPO-ptx']['1.3B']), 'Fig. 1'); has(L1, 5, pc(RC.fig1['GPT']['175B']), 'Fig. 1'); has(L1, 5, Math.round(175 / 1.3) + ' times smaller', 'Fig. 1');
    // Fig. 3: the episode, both modes
    const D = window.IG_EP, P3 = (v, d) => v.toFixed(d);
    for (const m of ['ppo', 'ptx']) { const E = D[m], L = items('sx-ep-' + m), id = 'Fig. 3 ' + m;
      has(L, 0, '"' + E.prompt.join(' ') + '"', id); has(L, 0, E.y.slice(0, -1).join(' '), id); has(L, 0, '(true score ' + E.u + ')', id);
      E.pRL.forEach(v => has(L, 0, P3(v, 3), id)); has(L, 1, sg(E.pen[0]), id); has(L, 2, sg(E.rm), id); has(L, 3, sg(E.tot), id); E.An.forEach(v => has(L, 3, sg(v), id));
      n++; if (E.pen.slice(1).some(v => Math.abs(v) >= .05)) bad.push(id + ': a word other than the first carries a visible KL penalty, but the list says almost nothing elsewhere');
      if (m === 'ppo') { has(L, 1, P3(E.pSF[0], 3), id); has(L, 4, P3(E.pRL[0], 3) + ' to ' + P3(E.after0[0], 3), id); has(L, 4, 'is ' + P3(E.ce[0], 2) + ' nats per word', id); has(L, 4, "SFT model's " + P3(E.ceSFT, 2), id); has(L, 4, 'leaves it at ' + P3(E.ce[1], 2), id) }
      else { has(L, 4, P3(E.pRL[0], 3) + ' to ' + P3(E.after0[0], 3), id); has(L, 4, P3(E.ce[1], 2) + ' nats per word', id); has(L, 4, "SFT model's " + P3(E.ceSFT, 2), id); has(L, 4, 'plain PPO: ' + P3(D.ppo.ce[0], 2), id);
        has(L, 5, 'falls to ' + P3(E.ce[2], 2) + ' instead of ' + P3(E.ce[1], 2), id); has(L, 5, 'moves to ' + P3(E.after1[0], 3), id); has(L, 5, '"' + E.win.c.join(' ') + '" followed by "' + E.win.y + '"', id);
        has(L, 3, 'a surprise of +' + Math.min(...E.Ad).toFixed(3) + ' to +' + Math.max(...E.Ad).toFixed(3) + ' per word', id); n++; if (Math.min(...E.Ad).toFixed(3) !== '0.001' || Math.max(...E.Ad).toFixed(3) !== '0.002') bad.push(id + ': the stated surprise of +0.001 to +0.002 per word does not match ' + E.Ad.join(',')) } }
    // the stage data is the live toy's: train the two policies in the page and recompute episode 0 exactly as mk_stage_data.cjs does
    await new Promise(res => TM.train(TOY_PPO, null, () => TM.train(TOY_PTX, null, res)));
    const S = TM.st.S, BETA = D.beta, GAM = D.gamma, ETA = D.eta;
    for (const [m, c] of [['ppo', TOY_PPO], ['ptx', TOY_PTX]]) { const R = TM.st.runs[TM.key(c)], st = R.st, nEp = D.episode;
      const rr0 = TOY.rng(4242 + nEp), t = rr0.int(TOY.NT), s = TOY.sample(R.pol, t, rr0), ref = TOY.seqLogps(S.sft, t, s.y), rm = TOY.rmScore(S.rm, t, s.y), nn = s.y.length;
      const pen = s.lps.map((lp, i) => -BETA * (lp - ref[i])), V = st.Vt[t], G = []; let acc = 0; for (let i = nn - 1; i >= 0; i--) { acc += pen[i] + (i === nn - 1 ? rm : 0); G[i] = acc }
      const An = G.map((x, i) => (x - V[i] - st.last.mu) / st.last.sd), P = [], rr = TOY.rng(77 + nEp); for (let k = 0; k < 8 * nn; k++) P.push(S.ptxW[rr.int(S.ptxW.length)]);
      const ep = { t, s, A: Float64Array.from(An) }, step = gr => { const q = TOY.cloneP(R.pol); ['E', 'b1', 'U', 'b2'].forEach(k => { for (let i = 0; i < q[k].length; i++)q[k][i] += ETA * gr[k][i] }); return q };
      const p1 = step(TOY.ppoGrad(R.pol, [ep], P, GAM).g), E = D[m], close = (a, b2) => Math.abs(a - b2) < 2e-6;
      n++; if (s.y.map(x => TOY.WORDS[x]).join(' ') !== E.y.join(' ')) bad.push('live ' + m + ': words differ');
      n++; if (!close(rm, E.rm) || pen.some((v, i) => !close(v, E.pen[i])) || An.some((v, i) => !close(v, E.An[i]))) bad.push('live ' + m + ': rewards or advantages differ from IG_EP');
      n++; if (!close(TOY.meanCE(R.pol, P), E.ce[0]) || !close(TOY.meanCE(p1, P), E.ce[2])) bad.push('live ' + m + ': pretraining losses differ from IG_EP') }
    // Then and now: the list has one item per source
    n++; if (document.getElementById('sx-thn').children.length !== +document.getElementById('thnCtl-s').max + 1) bad.push('Then and now: list and steps differ');
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
